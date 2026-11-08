# Git 同步指引

- 本地游戏仓库根目录是 `E:\RatProject\blade-orbit-ByCC`。
- GitHub 仓库地址是 `https://github.com/RATRAT666/RatGameDesign.git`，目标分支是 `main`。游戏位于远端仓库的 `blade-orbit-ByCC/` 子目录。
- 本地 Git 的 `upstream` 保存上述地址，可用 `git remote get-url upstream` 核对。双方仓库根目录和提交历史不同。

同步前先在本地游戏仓库运行 `git status --short`，检查并保留未提交改动。用独立的完整 GitHub 克隆拉取 `main`，核对差异后，只同步 `blade-orbit-ByCC/` 下的相关文件。把这个子目录映射到本地游戏仓库根目录。

用户明确要求上传时，在完整克隆中提交和推送，保持远端子目录结构。在本地游戏仓库提交同步改动时，在提交说明中记录对应的上游提交号。
