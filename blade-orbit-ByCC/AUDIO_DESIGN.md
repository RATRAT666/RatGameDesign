# v0.4.3 锁链与禁锢音效

原版本只有锁链命中复用的普通受击音，没有这组机制的专属声音。本版复用游戏已有 WebAudio 音源、总线、压缩器和静音设置。合成技术参考 [MDN WebAudio 包络与噪声音序](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques)，使用 [OfflineAudioContext](https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext) 做独立渲染检查。

| 事件 | 听觉设计 | 触发限制 |
| --- | --- | --- |
| 发射 chainCast | 三下渐升金属抖动加短甩动噪声 | 全局 0.12 秒 |
| 连环续射 chainLink | 更高、更短的扣环声 | 全局 0.1 秒 |
| 命中 chainHit | 中低金属撞击加少量高频泛音 | 全局 0.055 秒，替代普通 hit |
| 拉紧 chainTension | 低沉的链环绷紧声 | 每槽 0.65 秒，全局 0.32 秒；实际产生拉力才触发 |
| 断裂 chainBreak | 短促脆响和两段金属尾音 | 全局 0.12 秒，仅超长断裂 |
| 回收 chainRecall | 三下渐低金属滑动 | 全局 0.18 秒，每次开始回收播放一次 |
| 禁锢 bindOn | 不协和双音下滑，短促收紧 | 全局 0.12 秒 |
| 解除 bindOff | 微弱上滑与消散噪声 | 全局 0.16 秒，仅活敌到期解除 |

15 项机制与触发测试、3 项音频合成测试通过。音效在音频时间零点也限频；静音不创建新声源。浏览器离线渲染覆盖逐个播放与 5 倍密集触发，所有音效均有非零输出，混音未削波。Chrome 用户点击后 AudioContext 为 running，开关静音与八种音效运行无脚本错误。

试听长度 10 秒：从 0.2 秒起，按表格顺序每隔 0.8 秒播放一种；第 7 秒后是密集叠音检查。此检查保证音频可输出及触发正确，不等同于人耳对最终听感的验收。
