"""Run the offline builder and every descendant in one bounded Windows job.

No web request launches this program. On POSIX use a dedicated build machine;
nice plus the builder's serial batches/pacing apply, and containers can add a
hard CPU/memory quota. The Windows job is a hard cap, including Chromium.
"""
import ctypes
from ctypes import wintypes
import json
import os
from pathlib import Path
import subprocess
import sys


def windows_run(arguments):
    kernel = ctypes.WinDLL('kernel32', use_last_error=True)
    class BasicLimits(ctypes.Structure):
        _fields_ = [('PerProcessUserTimeLimit', ctypes.c_longlong), ('PerJobUserTimeLimit', ctypes.c_longlong),
                    ('LimitFlags', wintypes.DWORD), ('MinimumWorkingSetSize', ctypes.c_size_t),
                    ('MaximumWorkingSetSize', ctypes.c_size_t), ('ActiveProcessLimit', wintypes.DWORD),
                    ('Affinity', ctypes.c_size_t), ('PriorityClass', wintypes.DWORD), ('SchedulingClass', wintypes.DWORD)]
    class IoCounters(ctypes.Structure):
        _fields_ = [(name, ctypes.c_ulonglong) for name in ['ReadOperationCount', 'WriteOperationCount', 'OtherOperationCount', 'ReadTransferCount', 'WriteTransferCount', 'OtherTransferCount']]
    class ExtendedLimits(ctypes.Structure):
        _fields_ = [('BasicLimitInformation', BasicLimits), ('IoInfo', IoCounters),
                    ('ProcessMemoryLimit', ctypes.c_size_t), ('JobMemoryLimit', ctypes.c_size_t),
                    ('PeakProcessMemoryUsed', ctypes.c_size_t), ('PeakJobMemoryUsed', ctypes.c_size_t)]
    class CpuLimit(ctypes.Structure):
        _fields_ = [('ControlFlags', wintypes.DWORD), ('CpuRate', wintypes.DWORD)]
    class Startup(ctypes.Structure):
        _fields_ = [('cb', wintypes.DWORD), ('lpReserved', wintypes.LPWSTR), ('lpDesktop', wintypes.LPWSTR),
                    ('lpTitle', wintypes.LPWSTR), ('dwX', wintypes.DWORD), ('dwY', wintypes.DWORD),
                    ('dwXSize', wintypes.DWORD), ('dwYSize', wintypes.DWORD), ('dwXCountChars', wintypes.DWORD),
                    ('dwYCountChars', wintypes.DWORD), ('dwFillAttribute', wintypes.DWORD),
                    ('dwFlags', wintypes.DWORD), ('wShowWindow', wintypes.WORD), ('cbReserved2', wintypes.WORD),
                    ('lpReserved2', ctypes.POINTER(ctypes.c_byte)), ('hStdInput', wintypes.HANDLE),
                    ('hStdOutput', wintypes.HANDLE), ('hStdError', wintypes.HANDLE)]
    class ProcessInfo(ctypes.Structure):
        _fields_ = [('hProcess', wintypes.HANDLE), ('hThread', wintypes.HANDLE), ('dwProcessId', wintypes.DWORD), ('dwThreadId', wintypes.DWORD)]
    kernel.CreateJobObjectW.argtypes = [ctypes.c_void_p, wintypes.LPCWSTR]; kernel.CreateJobObjectW.restype = wintypes.HANDLE
    kernel.SetInformationJobObject.argtypes = [wintypes.HANDLE, ctypes.c_int, ctypes.c_void_p, wintypes.DWORD]
    kernel.AssignProcessToJobObject.argtypes = [wintypes.HANDLE, wintypes.HANDLE]
    kernel.QueryInformationJobObject.argtypes = [wintypes.HANDLE, ctypes.c_int, ctypes.c_void_p, wintypes.DWORD, ctypes.c_void_p]
    kernel.CreateProcessW.argtypes = [wintypes.LPCWSTR, wintypes.LPWSTR, ctypes.c_void_p, ctypes.c_void_p, wintypes.BOOL,
                                     wintypes.DWORD, ctypes.c_void_p, wintypes.LPCWSTR, ctypes.POINTER(Startup), ctypes.POINTER(ProcessInfo)]
    kernel.ResumeThread.argtypes = [wintypes.HANDLE]; kernel.ResumeThread.restype = wintypes.DWORD
    kernel.WaitForSingleObject.argtypes = [wintypes.HANDLE, wintypes.DWORD]
    kernel.GetExitCodeProcess.argtypes = [wintypes.HANDLE, ctypes.POINTER(wintypes.DWORD)]
    kernel.CloseHandle.argtypes = [wintypes.HANDLE]
    kernel.TerminateProcess.argtypes = [wintypes.HANDLE, wintypes.UINT]
    kernel.GetStdHandle.argtypes = [wintypes.DWORD]; kernel.GetStdHandle.restype = wintypes.HANDLE
    def checked(value):
        if not value: raise ctypes.WinError(ctypes.get_last_error())
        return value
    job = checked(kernel.CreateJobObjectW(None, None)); info = ProcessInfo()
    try:
        limits = ExtendedLimits()
        limits.BasicLimitInformation.LimitFlags = 0x2000 | 0x200 | 0x20  # kill on close, whole-job memory, priority
        limits.BasicLimitInformation.PriorityClass = 0x4000  # below normal
        limits.JobMemoryLimit = 1536 * 1024 * 1024
        checked(kernel.SetInformationJobObject(job, 9, ctypes.byref(limits), ctypes.sizeof(limits)))
        cpu = CpuLimit(0x1 | 0x4, 1000)  # enable + hard cap; 10 percent of host CPU
        checked(kernel.SetInformationJobObject(job, 15, ctypes.byref(cpu), ctypes.sizeof(cpu)))
        startup = Startup(); startup.cb = ctypes.sizeof(startup); startup.dwFlags = 0x100 | 0x1
        startup.wShowWindow = 0
        startup.hStdInput = kernel.GetStdHandle(0xfffffff6)
        startup.hStdOutput = kernel.GetStdHandle(0xfffffff5)
        startup.hStdError = kernel.GetStdHandle(0xfffffff4)
        command = ctypes.create_unicode_buffer(subprocess.list2cmdline(arguments))
        # Suspend before assignment: the worker cannot spawn an uncapped browser in the gap.
        checked(kernel.CreateProcessW(None, command, None, None, True, 0x4 | 0x4000, None, None, ctypes.byref(startup), ctypes.byref(info)))
        try:
            checked(kernel.AssignProcessToJobObject(job, info.hProcess))
            if kernel.ResumeThread(info.hThread) == 0xffffffff: raise ctypes.WinError(ctypes.get_last_error())
        except BaseException:
            kernel.TerminateProcess(info.hProcess, 1); raise
        print('PDF builder: one worker, Windows hard CPU cap 10%, whole-job memory cap 1536 MiB.', flush=True)
        kernel.WaitForSingleObject(info.hProcess, 0xffffffff)
        code = wintypes.DWORD(); checked(kernel.GetExitCodeProcess(info.hProcess, ctypes.byref(code)))
        measured = ExtendedLimits()
        checked(kernel.QueryInformationJobObject(job, 9, ctypes.byref(measured), ctypes.sizeof(measured), None))
        telemetry = {'hardCpuPercent': 10, 'hardJobMemoryMiB': 1536, 'peakJobMemoryMiB': round(measured.PeakJobMemoryUsed / 1024 / 1024, 1), 'exitCode': code.value}
        path = Path('.runtime/course-pdf-cache/resource-report.json'); path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(telemetry, indent=2) + '\n', encoding='utf-8')
        print('PDF builder resource report: ' + json.dumps(telemetry), flush=True)
        return code.value
    finally:
        if info.hThread: kernel.CloseHandle(info.hThread)
        if info.hProcess: kernel.CloseHandle(info.hProcess)
        kernel.CloseHandle(job)


if __name__ == '__main__':
    os.environ['EDU_PDF_BUILD_LIMITED'] = '1'
    if os.name == 'nt': sys.exit(windows_run(sys.argv[1:]))
    os.nice(10)
    sys.exit(subprocess.call(sys.argv[1:]))
