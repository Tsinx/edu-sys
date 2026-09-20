#!/usr/bin/env python3
"""Plan or apply the authorized classroom-only cleanup while the app is stopped.

Plan contains only classroom IDs/course IDs and a cutoff, never student data.
Application requires a complete stopped-service backup. Grades and account data
are checked by logical hashes before/after. Deployment restores all DBs on error.
"""
import argparse
import datetime
import hashlib
import json
import os
from pathlib import Path
import sqlite3


def connect(path):
    return sqlite3.connect(f'file:{path}?mode=rw', uri=True)


def fingerprint(directory):
    result = {}
    for suffix in ['accounts', 'edge', 'port-results']:
        path = directory / f'state.json.{suffix}.sqlite'
        with connect(path) as db:
            for (table,) in db.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"):
                # Login sessions may expire on restart, but cleanup must not touch any.
                rows = db.execute(f'SELECT * FROM "{table}" ORDER BY rowid').fetchall()
                result[f'{suffix}/{table}'] = hashlib.sha256(repr(rows).encode()).hexdigest()
    with connect(directory / 'state.json.platform.sqlite') as db:
        rows = db.execute("SELECT collection,id,payload FROM platform_documents WHERE collection NOT IN ('classSessions','classroomRuntimes','activities','portal') ORDER BY collection,id").fetchall()
        result['platform/preserved'] = hashlib.sha256(repr(rows).encode()).hexdigest()
    return result


def make_plan(directory):
    with connect(directory / 'state.json.platform.sqlite') as db:
        rows = db.execute("SELECT payload FROM platform_documents WHERE collection='classSessions' AND id NOT IN ('__order','__value')").fetchall()
    sessions = [json.loads(r[0]) for r in rows]
    return {'schema': 1, 'cutoff': datetime.datetime.now(datetime.timezone.utc).isoformat(),
            'classrooms': [{'id': s['id'], 'courseId': s['courseId']} for s in sessions]}


def apply(directory, plan, backup, simulation=None):
    pidfile = directory / 'server.pid'
    if pidfile.exists():
        try:
            os.kill(int(pidfile.read_text()), 0)
        except ProcessLookupError:
            pass
        else:
            raise RuntimeError('Stop edu-campus before applying cleanup')
    for path in directory.glob('*.sqlite'):
        saved = backup / path.name
        if not saved.is_file():
            raise RuntimeError(f'Missing stopped-service backup: {path.name}')
        with connect(saved) as db:
            assert db.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
    before = fingerprint(directory)
    if before != fingerprint(backup):
        raise RuntimeError('Backup differs from current data; take a fresh stopped-service backup')
    ids = [c['id'] for c in plan['classrooms']]
    course_ids = {c['id']: c['courseId'] for c in plan['classrooms']}
    placeholders = ','.join('?' for _ in ids)
    if not ids:
        return {'removed': 0, 'preserved': before}
    with connect(directory / 'state.json.participation.sqlite') as db:
        db.execute(f'DELETE FROM participation_answers WHERE activity_id IN (SELECT id FROM participation_activities WHERE session_id IN ({placeholders}))', ids)
        for table in ['participation_members', 'participation_groups', 'participation_activities', 'participation_rooms']:
            db.execute(f'DELETE FROM {table} WHERE session_id IN ({placeholders})', ids)
    if simulation and simulation.exists():
        if not (backup / simulation.name).exists():
            raise RuntimeError('Simulation database must be backed up before cleanup')
        with connect(simulation) as db:
            for table in ['port_simulation_events', 'port_simulation_checkpoints', 'port_simulation_receipts']:
                db.execute(f'DELETE FROM {table} WHERE run_id IN (SELECT run_id FROM port_simulation_runs WHERE session_id IN ({placeholders}))', ids)
            db.execute(f'DELETE FROM port_simulation_runs WHERE session_id IN ({placeholders})', ids)
    with connect(directory / 'state.json.platform.sqlite') as db:
        for collection in ['classSessions', 'classroomRuntimes']:
            db.execute(f'DELETE FROM platform_documents WHERE collection=? AND id IN ({placeholders})', [collection, *ids])
        remaining = [r[0] for r in db.execute("SELECT id FROM platform_documents WHERE collection='classSessions' AND id NOT IN ('__order','__value')")]
        db.execute("DELETE FROM platform_documents WHERE collection='classSessions' AND id IN ('__order','__value')")
        db.execute('INSERT INTO platform_documents VALUES(?,?,?)', ('classSessions', '__order' if remaining else '__value', json.dumps(remaining)))
        # Keep course creation/update activity. Legacy class activity has no session ID.
        for key, raw in db.execute("SELECT id,payload FROM platform_documents WHERE collection='activities' AND id NOT IN ('__order','__value')").fetchall():
            row = json.loads(raw)
            if row.get('sessionId') in ids or (not row.get('sessionId') and row.get('type') in ['class_started','class_ended','class_completed','class_scheduled']):
                db.execute("DELETE FROM platform_documents WHERE collection='activities' AND id=?", (key,))
        activities = [r[0] for r in db.execute("SELECT id FROM platform_documents WHERE collection='activities' AND id NOT IN ('__order','__value')")]
        db.execute("DELETE FROM platform_documents WHERE collection='activities' AND id IN ('__order','__value')")
        db.execute('INSERT INTO platform_documents VALUES(?,?,?)', ('activities', '__order' if activities else '__value', json.dumps(activities)))
        row = db.execute("SELECT payload FROM platform_documents WHERE collection='portal' AND id='deletedClassrooms'").fetchone()
        deleted = json.loads(row[0]) if row else {}
        for id in ids:
            deleted.setdefault(id, {'courseId': course_ids[id], 'deletedAt': plan['cutoff']})
        defaults = {'preparations': {}, 'readings': {}, 'preferences': {}, 'startRequests': {}}
        for key, value in defaults.items():
            db.execute('INSERT OR IGNORE INTO platform_documents VALUES(?,?,?)', ('portal', key, json.dumps(value)))
        db.execute('INSERT OR REPLACE INTO platform_documents VALUES(?,?,?)', ('portal', 'deletedClassrooms', json.dumps(deleted)))
        db.execute("DELETE FROM platform_documents WHERE collection='portal' AND id='__value'")
    after = fingerprint(directory)
    if before != after:
        raise RuntimeError('Preserved records changed; restore all databases from backup')
    return {'removed': len(ids), 'preserved': after}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('data', type=Path)
    parser.add_argument('--plan', type=Path, required=True)
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--backup', type=Path)
    parser.add_argument('--simulation', type=Path)
    args = parser.parse_args()
    if args.apply:
        if not args.backup:
            parser.error('--backup is required for apply')
        result = apply(args.data, json.loads(args.plan.read_text()), args.backup, args.simulation)
    else:
        plan = make_plan(args.data)
        args.plan.write_text(json.dumps(plan, indent=2))
        args.plan.chmod(0o600)
        result = {'planned': len(plan['classrooms']), 'cutoff': plan['cutoff']}
    print(json.dumps(result, indent=2))
