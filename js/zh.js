/* 中文 for Three Kingdoms TT: every word on the page, the toasts and banners, the storybook cards, the heroes'
   titles, the stage and general names, the ? panel (Kit.lang, from kit/lang.js). The comic bursts (POW!) are drawn
   on canvases, so js/fx.js asks Kit.lang.t() for them; their words are here too.
   Staying in English on purpose: the kids' and friends' names (TEDDY, TOMMY, ZOOM, LUNA, BOLT, BRUNO), the game's
   name and logo (Alan's pick), and the 1P / 2P labels. The Chinese stage names and the 三国 seal show in English
   too, as decoration; in 中文 they're hidden where they would repeat. */
(function () {
  const L = Kit.lang;
  L.keep([
    'THREE KINGDOMS', 'TT', 'Three Kingdoms TT', 'Claude Code', 'Esc', '1P', '2P',
    'TEDDY', 'TOMMY', 'ZOOM', 'LUNA', 'BOLT', 'BRUNO', 'TEDDY!', 'TOMMY!',
  ]);

  // the storybook: stage names, stories, the generals
  const STAGE = {
    'THE PEACH GARDEN OATH': '桃园结义', 'THE YELLOW TURBANS': '黄巾之乱', 'SHOWDOWN AT TIGER GATE': '大战虎牢关',
    'BONUS: SMASH THE JARS': '奖励关：砸罐子', 'THE BRIDGE AT CHANGBAN': '长坂坡', 'FIRE AT THE RED CLIFFS': '火烧赤壁',
    'BONUS: LANTERN NIGHT': '奖励关：元宵灯会', 'THE EMPTY CITY TRICK': '空城计',
  };
  const BOSS = {
    'SERGEANT STRAW': '草帽大兵长', 'YELLOW TURBAN WIZARD': '黄巾大法师', 'MIGHTY LÜ BU': '无敌吕布',
    'GENERAL CLANK': '铁甲大将军', 'GRUMPY CAO CAO': '生气的曹操', 'SNEAKY SIMA YI': '狡猾的司马懿',
  };
  const BOSS_LINE = {
    'The biggest hat in the army!': '全军最大的草帽！', 'Calls the thunder!': '会叫来打雷！',
    'Strongest in the land (he says)!': '天下第一（他自己说的）！', 'The iron robot general!': '铁皮机器人大将军！',
    'Admiral of a thousand boats!': '一千条船的大元帅！', 'Is the city really empty?!': '城里真的没人吗？！',
  };
  const HERO = {
    'THE DRAGON SPEAR': '龙枪小英雄', 'THE LITTLE STRATEGIST': '小军师', 'THE ROARING SPEAR': '吼声猛将',
    'THE MOON PRINCESS': '月亮公主', 'THE WOODEN-OX BOT': '木牛机器人', 'THE BEARDED GENERAL': '美髯熊将军',
    'spear jab · straight · sweep': '长枪：刺 · 直刺 · 横扫', 'feather fan · fan · gust': '羽扇：扇 · 扇 · 大风',
    'snake spear thrust · thrust · chop': '蛇矛：刺 · 刺 · 劈', 'twin swords · swords · spin': '双剑：砍 · 砍 · 转圈',
    'foam hammer · bonk · SLAM': '泡沫锤：敲 · 敲 · 砸', 'green-dragon blade · cut · crescent': '青龙刀：砍 · 砍 · 月牙斩',
  };
  const MAGIC = {
    'DRAGON DUNK!': '神龙灌篮！', 'FEATHER-FAN GALE!': '羽扇狂风！', 'THUNDER ROAR!': '雷霆怒吼！', 'FIRE SWIRL!': '火焰旋风！',
    'REPEATING CROSSBOW!': '诸葛连弩！', 'GREEN DRAGON WAVE!': '青龙偃月波！', 'RESCUE SPIN!': '救命旋风！', 'HORSE STOMP!': '战马踏地！',
  };
  const FOOD = {
    'BAO BUN': '包子', DRUMSTICK: '鸡腿', 'LONGEVITY PEACH': '寿桃', 'ICE CREAM': '冰淇淋', WATER: '水',
    'JUICE BOX': '果汁', COOKIE: '饼干', WATERMELON: '西瓜', BANANA: '香蕉',
  };
  const STORY = {
    'Under the peach blossoms, three heroes promised to look after each other and help everyone. Teddy and Tommy want to be heroes too! First, some practice with the silly straw-hat soldiers.':
      '在开满桃花的园子里，三位英雄约好要互相照顾，还要帮助大家。Teddy 和 Tommy 也想当英雄！先和搞笑的草帽兵练练手吧。',
    'Uh-oh! A sneaky wizard tied yellow scarves on everyone and turned them into wobbly zombies. Hop on a horse and gallop to the rescue!':
      '糟糕！一个坏法师给大家系上黄头巾，把他们变成了摇摇晃晃的僵尸。快骑上马，冲过去救大家！',
    'At the great Tiger Gate waits Lü Bu, with two giant feathers on his helmet. He says nobody can beat him. Three heroes took him on together. Can you?':
      '高高的虎牢关前，站着头上插着两根大羽毛的吕布。他说谁都打不过他。当年三位英雄一起和他比试。你也行吗？',
    'The heroes found a courtyard full of old jars, and there are coins hiding inside! Smash as many as you can before the incense stick burns down.':
      '英雄们发现一个院子，里面全是旧罐子，罐子里藏着金币！在香烧完之前，能砸多少就砸多少！',
    'Brave Zhao Yun rode through a whole army to carry a baby to safety, and at the bridge Zhang Fei roared so loud that everyone ran away! Now an iron robot general is coming. Roar!':
      '勇敢的赵云骑马冲过整支军队，把小宝宝平安救了出来。张飞站在桥上大吼一声，吓得大家都跑掉了！现在铁甲机器人将军来了。吼！',
    'Cao Cao tied his thousand boats together. Tommy the little strategist waves his feather fan and calls the east wind. Whoosh! Run across the boats and stop the grumpy admiral!':
      '曹操把一千条船连在了一起。小军师 Tommy 挥挥羽扇，借来了东风。呼——！快跑过一条条船，拦住生气的大元帅！',
    'Lantern festival! The whole town is lit up, and the jars are stuffed with coins and gold. Smash them before the incense stick burns down!':
      '元宵节到啦！全城灯火通明，罐子里塞满了金币和元宝。在香烧完之前把它们砸开！',
    "The strategist opened the city gates, sat on the wall and played music. Sneaky Sima Yi thought it was a trap! Now he's back with zombies AND robots. The last fight!":
      '军师打开城门，坐在城墙上弹琴。狡猾的司马懿以为有埋伏，吓得跑掉了！现在他带着僵尸和机器人回来了。最后一战！',
  };
  // the first stage's hints (with keys, or on a touch screen)
  const TIP = {
    'Walk with W A S D. Swing your weapon with F!': '用 W A S D 走路，按 F 挥动武器！',
    'Walk with the joystick. Tap ⚔️ to swing!': '用摇杆走路，点 ⚔️ 挥武器！',
    'G jumps. Jump, then F = flying kick! Bonk the chest open too.': '按 G 跳。跳起来再按 F = 飞踢！也把宝箱打开吧。',
    'Tap ⬆️ to jump, then ⚔️ for a flying kick! Bonk the chest open too.': '点 ⬆️ 跳，再点 ⚔️ 飞踢！也把宝箱打开吧。',
    'Walk into a soldier to grab him, then F F F to toss him!': '走到士兵身上就能抓住他，再按 F F F 把他扔出去！',
    'Walk into a soldier to grab him, then ⚔️ ⚔️ ⚔️ to toss him!': '走到士兵身上就能抓住他，再点 ⚔️ ⚔️ ⚔️ 把他扔出去！',
    'H = magic! It uses a 🔮. Press T to call your brother!': 'H = 法术！会用掉一个 🔮。按 T 叫兄弟来帮忙！',
    "Tap ✨ for magic! It uses a 🔮. Tap your brother's face to call him!": '点 ✨ 放法术！会用掉一个 🔮。点兄弟的头像叫他来帮忙！',
    'A horse! Walk to it to ride, G hops off. Press R any time to call one.': '有马！走过去就能骑上，按 G 跳下来。随时按 R 都能叫一匹马来。',
    'A horse! Walk to it to ride, ⬆️ hops off. Tap 🐎 any time to call one.': '有马！走过去就能骑上，点 ⬆️ 跳下来。随时点 🐎 都能叫一匹马来。',
    'Player 1: W A S D and F. Player 2: the arrows and J.': '1 号玩家：W A S D 和 F。2 号玩家：方向键和 J。',
    'Each player has a joystick and ⚔️ to swing!': '每个玩家都有一个摇杆和 ⚔️ 按钮！',
    'H or L = magic! It uses a 🔮. T = TEAM-UP!': 'H 或 L = 法术！会用掉一个 🔮。T = 合体必杀！',
    'Tap ✨ for magic! It uses a 🔮. Tap TEAM-UP when it glows!': '点 ✨ 放法术！会用掉一个 🔮。合体按钮亮了就点它！',
  };
  // the comic bursts (drawn on canvases through Kit.lang.t)
  const BURST = {
    'POW!': '砰！', 'BOP!': '啵！', 'BAM!': '嘭！', 'WHUMP!': '咚！', 'FLOMP!': '噗！', 'FWUMP!': '噗噗！', 'WHOOSH!': '呼——！',
    'SQUAWK!': '嘎！', 'WHAM!': '砰砰！', 'STRIKE!': '全倒！', 'BOING!': '嘣！', 'PEACE!': '耶！', 'KA-BOOM!': '轰隆！',
    'OOF!': '哎哟！', 'BONK!': '咚！', 'THUD!': '咚隆！', 'HI!': '嗨！', 'WHEE!': '咻——！', 'HIGH FIVE!': '击掌！',
    'SAVED!': '救啦！', 'POOF!': '噗！', 'BEEP!': '哔！', 'BOINK!': '啵嘤！', 'POKE!': '戳！', 'SWISH!': '唰！', 'FWIP!': '嗖！',
    'CLANG!': '当！', 'WHIRL!': '转转转！', 'CLIP-CLOP!': '嘚嘚！', 'ZAP!': '噼啪！', 'FWOOSH!': '呼啦！', 'THWIP!': '嗖嗖！',
    'SHING!': '锵！', 'WHOA!': '哇啊！', 'CRACK!': '咔嚓！', 'PERFECT!': '完美！', 'LEVEL UP!': '升级！',
    'BUMP!': '颠一下！', 'GOTCHA!': '抓到啦！', 'NEIGH!': '咴——！',
  };
  [STAGE, BOSS, BOSS_LINE, HERO, MAGIC, FOOD, STORY, TIP, BURST].forEach((d) => L.add(d));

  L.add({
    // title
    "Teddy & Tommy's storybook adventure in old China": 'Teddy 和 Tommy 的古代中国故事书大冒险',
    '▶ 1 PLAYER': '▶ 1 个人玩', 'pick a hero (+ call your brother)': '选一位英雄（还能叫兄弟帮忙）',
    '👫 2 PLAYERS': '👫 2 个人玩', 'together, one keyboard or iPad': '一起玩，一个键盘或一台 iPad',
    'EASY': '简单', 'lots of hearts, slow soldiers': '好多颗心，士兵走得慢', 'NORMAL': '普通', 'for big kids': '大孩子玩',
    '📖 STAGES': '📖 选关', 'Difficulty': '难度',
    'PLAYER 1': '1 号玩家', 'PLAYER 2': '2 号玩家', 'walk (up and down the road too)': '走路（也能在路上上下走）',
    'swing · jump · magic': '挥武器 · 跳 · 法术', 'dash': '冲刺', 'double-tap': '连按两下', 'call your brother / team-up': '叫兄弟 / 合体必杀',
    "Joystick to walk (flick it twice to dash). ⚔️ swing, ⬆️ jump, ✨ magic. Tap your brother's face to call him! On an iPad, two players can play side by side.":
      '用摇杆走路（快推两下冲刺）。⚔️ 挥武器，⬆️ 跳，✨ 法术。点兄弟的头像叫他来帮忙！在 iPad 上两个人可以并排一起玩。',
    'built with': '制作工具', 'Sound (M)': '声音 (M)', 'Pause (P)': '暂停 (P)',
    'Call your brother (T)': '叫兄弟 (T)', 'Team-up special (T or Enter)': '合体必杀 (T 或回车)',
    '↻ Turn sideways for a bigger adventure!': '↻ 把手机横过来，冒险更大！', 'LOADING…': '加载中…',
    // picking heroes and stages
    'PICK YOUR HERO!': '选一位英雄！', 'PLAYER 1, PICK A HERO!': '1 号玩家，选英雄！', 'PLAYER 2, PICK A HERO!': '2 号玩家，选英雄！',
    '◀ BACK': '◀ 返回', 'PICK A STAGE': '选一关', 'smash the jars!': '砸罐子！',
    // the storybook card
    'BONUS ROUND': '奖励关', 'GO! ▶': '出发！▶',
    // HUD
    'YOU': '你', 'CALL': '叫', 'BOSS': '大将', 'TAP FOR A TREAT': '点一下，再要点心', 'TEAM-UP!': '合体必杀！', '🛡️ SAFE': '🛡️ 安全', 'GO ➜': '前进 ➜',
    // banners and toasts
    'BONUS!': '奖励关！', 'FIGHT!': '开打！', 'SMASH THE JARS!': '砸罐子！', 'YOU WIN!': '你赢啦！', 'PERFECT!': '完美！',
    'Every jar smashed! Bonus gold!': '罐子全砸光啦！奖励元宝！', "TIME'S UP!": '时间到！', 'BONUS CLEAR!': '奖励关完成！',
    'STAGE CLEAR!': '过关啦！', 'BACK IN!': '回来啦！', 'GIDDY-UP! 🐎': '驾！🐎', '🐎 THE HORSE RAN HOME!': '🐎 马儿跑回家啦！',
    '+1 MAGIC! 🔮': '法术 +1！🔮',
    // pause, continue, results
    'PAUSED': '暂停', '▶ RESUME': '▶ 继续', 'MENU': '菜单', 'P · Esc · Space to resume · Q for the menu · M sound': 'P · Esc · 空格 继续 · Q 回菜单 · M 声音',
    'CONTINUE?': '继续吗？', 'GAME OVER': '游戏结束', 'YES! ▶': '好！▶', '↻ TRY AGAIN': '↻ 再试一次', 'NO': '不了',
    'No continues left, but you can try the stage again!': '没有续关机会了，不过可以再玩一次这一关！',
    'Have another go! (as many as you like on easy)': '再来一次！（简单模式想玩几次都行）',
    'YOU WON!': '你赢啦！', 'NEXT STAGE ▶': '下一关 ▶', '📖 ALL STAGES': '📖 所有关卡', '↻ AGAIN': '↻ 再玩', '📖 STAGES': '📖 选关',
    'Enter: next · R: again · Esc: menu': '回车：下一关 · R：再玩 · Esc：菜单',
    'The three kingdoms are friends again. Everyone goes home for bao buns! 🥟': '三个国家又成了好朋友。大家回家吃包子啦！🥟',
    '⭐ score': '⭐ 分数', '🪙 coins': '🪙 金币', '💫 soldiers sent home': '💫 送回家的士兵', '⏱️ time': '⏱️ 时间',
    '🛡️ saves': '🛡️ 保护', '🤜🤛 team-ups': '🤜🤛 合体必杀',
    // touch buttons
    'MAGIC': '法术', 'JUMP': '跳', 'SWING': '挥', 'HORSE': '叫马', 'call a horse': '叫一匹马', 'HERE COMES A HORSE!': '马儿来啦！',
    // the ? panel
    'Player 1': '1 号玩家', 'Player 2': '2 号玩家', 'swing your weapon': '挥武器', 'jump (jump + swing = flying kick)': '跳（跳 + 挥 = 飞踢）',
    'magic (uses a 🔮)': '法术（用一个 🔮）', 'rescue spin, or the horse stomp when riding (costs a heart)': '救命旋风，骑马时是战马踏地（用一颗心）',
    'walk into a soldier to grab him, swing to toss him': '走到士兵身上抓住他，再挥武器把他扔出去',
    'call a horse (walk to it to ride, jump to hop off)': '叫一匹马（走过去就能骑，跳一下就下马）',
    'on a horse: swing next to a soldier to scoop him up, swing again to fling him': '骑马时：贴着士兵挥武器就能把他拎起来，再挥一下把他甩出去', 'call your brother · team-up': '叫兄弟 · 合体必杀',
    'In 1 player both sets of keys work, and Space jumps. With no 🔮 left, magic does the rescue spin.': '1 个人玩时两组按键都能用，空格键也能跳。没有 🔮 了，法术键会放救命旋风。',
    "Joystick, ⚔️ SWING, ⬆️ JUMP, ✨ MAGIC and 🐎 HORSE. Tap your brother's face to call him.": '摇杆、⚔️ 挥、⬆️ 跳、✨ 法术和 🐎 叫马。点兄弟的头像叫他来帮忙。',
  });

  const tr = (dict, s) => dict[s] || s;
  const name = (s) => s; // the heroes' names stay English
  // things with names or numbers in them
  L.rule(/^STAGE (\d+)$/, '第 $1 关');
  L.rule(/^(\d+|★) · (.+)$/, (m, n, s) => `${n} · ${tr(STAGE, s)}`);
  L.rule(/^BOSS: (.+)$/, (m, b) => `大将：${tr(BOSS, b)}`);
  L.rule(/^boss: (.+)$/, (m, b) => `大将：${tr(BOSS, b)}`);
  L.rule(/^⏳ (\d+) SECONDS$/, '⏳ $1 秒');
  L.rule(/^(\w+) IS HERE! 🐎$/, (m, w) => `${name(w)} 骑马来啦！🐎`);
  L.rule(/^(\w+) SAVED YOU! 🛡️$/, (m, w) => `${name(w)} 救了你！🛡️`);
  L.rule(/^(\w+) IS BACK! 💪$/, (m, w) => `${name(w)} 回来啦！💪`);
  L.rule(/^(\w+) RIDES TOO!$/, (m, w) => `${name(w)} 也骑上马啦！`);
  L.rule(/^(\w+) IS OUT!$/, (m, w) => `${name(w)} 出局了！`);
  L.rule(/^BYE! (.+)$/, '拜拜！$1');
  L.rule(/^(.+) FROM (\w+)!$/, (m, item, w) => `${name(w)} 送来的${tr(FOOD, item)}！`);
  L.rule(/^(.+)! \+(\d+) ❤️$/, (m, item, n) => `${tr(FOOD, item)}！+${n} ❤️`);
  L.rule(/^WEAPON UP! (★+)$/, '武器升级！$1');
  L.rule(/^OUT · tap ⚔️$/, '出局 · 点 ⚔️');
  L.rule(/^OUT · press ([FJ])$/, '出局 · 按 $1');
  L.rule(/^OUT$/, '出局');
  L.rule(/^(\d+) continues? left$/, '还能续关 $1 次');
  L.rule(/^🏺 (\d+) jars smashed!$/, '🏺 砸了 $1 个罐子！');
  L.rule(/^(\S+) (.+): the end of the chapter!$/, (m, e, s) => `${e} ${tr(STAGE, s)}：这一章讲完啦！`);
  L.rule(/^🥟 treats from (\w+)$/, (m, w) => `🥟 ${name(w)} 送的点心`);
})();
