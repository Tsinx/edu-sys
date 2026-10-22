"""课前下载与校验，不运行回归。"""
from inpres_project import load_data, SHA256
data = load_data()
print(f"数据准备完成：{data.shape}；SHA-256 {SHA256}；后续可断网运行。")
