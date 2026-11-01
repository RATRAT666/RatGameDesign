# Noita 像素物理模拟：开发参考 v1.0

版本：v1.0｜核查日期：2026-11-01｜用途：类似游戏的架构选型与原型检查。下述实现资料主要来自 **2019 年开发者公开说明**，不代表当前游戏版本的内部参数，也不代表已审查引擎源码。

**架构速记：材料网格负责物质规则，可破坏刚体负责整体运动，局部更新与分块流送控制成本。** 以下分别列出开发者公开实现和面向新项目的建议。

## 已核实的实现事实

**材料格子。** Petri 将基础描述为复杂元胞自动机：液体先向下、再左右尝试移动，密度可决定交换；气体反向上浮；邻域规则产生燃烧等反应。[Petri 访谈，Material System Mechanics](https://80.lv/articles/noita-a-game-based-on-falling-sand-simulation)

**更新与并行。** 该访谈说明自底向上更新；以 **64×64** 小块及 dirty rect 缩减更新；分 **4 轮** 棋盘式调度，允许在本块及四正交方向延伸 **32 像素** 的十字区域操作，以避免线程重叠访问。文中的帧计数器是讨论简单方案仍需同步的论证，不能据此断言最终方案必然如此实现。[Petri 访谈，Optimization](https://80.lv/articles/noita-a-game-based-on-falling-sand-simulation)

**可破坏刚体。** 刚体像素保存归属和局部位置；破坏后重算形状，可能拆成多个刚体。[Petri 访谈，Explosions & Collapses](https://80.lv/articles/noita-a-game-based-on-falling-sand-simulation) Olli 补充：它同时有网格对齐位置和亚像素位置；前者用于液体通行等查询，后者跟随碰撞多边形运动。由此可推导：旋转物体与格子物质相互作用，需要衔接这两种表示。[Olli 在官方 AMA 的回答](https://www.reddit.com/r/Games/comments/d7cqjz/comment/f0ze4q3/)

**CPU 与世界流送。** Petri 说明模拟在 CPU 上，像素轮廓三角化后交给 Box2D；世界使用 **512×512** 块，探索时生成新块、旧块存盘，当时尝试维持约 12 块。屏外以待更新区域列表处理；他承认偶尔会见到液体进入视野才落下。[Petri 的技术问答](https://www.reddit.com/r/gamedev/comments/d93op6/comment/f1g045b/) 这里的 512 是流送尺度，前面的 64 是模拟调度尺度，不能混为同一层。[同一问答](https://www.reddit.com/r/gamedev/comments/d93op6/comment/f1g045b/)、[优化访谈](https://80.lv/articles/noita-a-game-based-on-falling-sand-simulation)

**模拟与画面。** Olli 明确说当时没有用 GPGPU 做模拟，原因包括既有 CPU 架构，迁移会牵动大量游戏代码；此回答仅说明模拟的位置，渲染管线需要另行核实。[Olli 的 CPU/GPU 回答](https://www.reddit.com/r/Games/comments/d7cqjz/comment/f0zaju5/) 开发参考中应将“材料格子”“可自由飞行的物质粒子”“纯视觉粒子”作为不同概念；本次未核实 Noita 后两者的完整结构与更新顺序，不应凭粒子外观推断实现。

## 面向新项目的实施建议（本文推导，非 Noita 事实）

1. **先确定权威状态。** 用紧凑格子数组保存材料、必要状态；画面从其生成。角色、投射物和刚体另设实体。让查询落点、燃烧、挖掘、液体共用材料状态，避免贴图已经挖空而碰撞仍挡路。不要把每个格子都做成独立 GameObject；是否采用 ECS、Jobs、Burst 或计算着色器，应由目标平台与实测决定。
2. **先做正确，再跳过工作。** 起步用小地图与单线程固定步长，验证落沙堆积、液体置换、燃烧和破坏；再引入活动块、dirty rect 和休眠。发生增删、邻居改变、刚体经过时，必须唤醒受影响区域。dirty rect 的扩张范围应覆盖规则的读取、写入和传播范围，不能只标记起点。
3. **把调度限制写成明确约束。** 棋盘方案的关键不是照抄 64 或 32，而是同轮任务的完整访问范围不冲突。列出液体横移、爆炸写入、反应传播、粒子落回格子的最大范围；超范围操作另排阶段或排队提交。测试边界穿越、重复更新、漏唤醒以及多线程结果差异，不能把“没有崩溃”视为正确。
4. **把两套物理的交接做小。** 先支持少量可破坏刚体：材料图提轮廓、简化、生成碰撞形状；破坏后检查连通分量并更新。单独处理旋转后的网格占用、重叠物质去向与形状重建预算。视觉粒子可限数量、寿命与采样；会重新成为物质的粒子必须走明确的落格规则。
5. **先规定屏外语义。** 明确哪些块持续模拟、哪些休眠、何时保存恢复；避免假设整张无限地图始终实时演化。分别记录活跃格子数、脏区面积、刚体重建时间、流送耗时与最慢帧，再决定优化。相同随机种子不自动保证并行模拟或重放确定性，须另行设计。

建议保留四个小型验证场景：沙堆跨块落下；油水界面被打散后重新分层；旋转木板同时阻挡液体并燃烧断裂；液池离开活动区再返回。每个场景同时检查材料数量变化、碰撞轮廓、唤醒传播与帧耗时。先规定哪些反应允许物质生成或消失，才有可能利用数量检查发现跨块丢失、重复写入和回填覆盖。

可复用方案优先参考 [Box2D 官方文档](https://box2d.org/documentation/)所提供的二维刚体基础，以及 [The Powder Toy 官方仓库](https://github.com/The-Powder-Toy/The-Powder-Toy)的落沙、热与空气模拟。它们分别适合研究刚体层和材料沙盒层，接入前仍需验证与目标项目的适配。The Powder Toy 仓库标注 GPL-3.0，移植前应核对许可与项目分发方式。

## 证据边界与继续阅读

这是一套服务玩法的近似规则，不是完整连续介质或结构力学求解器。开发者当时承认温度是简化模拟；对物理特性的取舍还受 CPU 成本和玩法影响。[官方 AMA](https://www.reddit.com/r/Games/comments/d7cqjz/we_are_nolla_games_the_team_behind_the_upcoming/)

首选继续观看 Petri 的 [GDC 2019 原讲《Exploring the Tech and Design of Noita》](https://www.youtube.com/watch?v=prXuyMCgbTc)，[GDC 官方介绍](https://www.gdcvault.com/play/1025695/Exploring-the-Tech-and-DesignAt)确认涵盖大世界落沙与可破坏刚体；[Nolla 引擎主页](https://nollagames.com/fallingeverything/)也直接指向该讲。本次核验了官方入口及开发者文字资料，未取得可可靠逐句核对的讲座字幕；因此没有为视频杜撰时间戳，也没有将 marching squares、粒子回填、完整帧阶段或渲染管线的具体做法写成已确认事实。
