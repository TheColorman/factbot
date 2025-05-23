import {
  Client,
  Intents,
  Message,
  MessageAttachment,
  MessageEmbed,
  MessagePayload,
  ReplyMessageOptions,
} from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { deleteAllMessagesInChannel } from './features/prune';

dotenv.config();
const token = process.env.TOKEN_FILE
  ? (console.log(`Reading token from file: ${process.env.TOKEN_FILE}`),
    fs.readFileSync(process.env.TOKEN_FILE, { encoding: 'utf8' })).trim()
  : (console.log('Reading token from environment variable'),
    process.env.TOKEN?.trim());

const IMAGES_DIR = process.env.IMAGES_DIR || path.join(__dirname, 'images');
const BUG_DIR = path.join(IMAGES_DIR, 'bug');
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const MEDIA_FILE = path.join(DATA_DIR, 'download.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');

// Create dirs and files if they do not exist.
function mkdirp(dir: string) {
  if (fs.existsSync(dir)) return true;
  const dirname = path.dirname(dir);
  mkdirp(dirname);
  fs.mkdirSync(dir);
}
if (!fs.existsSync(BUG_DIR)) {
  mkdirp(BUG_DIR);
}
if (!fs.existsSync(DATA_DIR)) {
  mkdirp(DATA_DIR);
}
if (!fs.existsSync(MEDIA_FILE)) {
  fs.writeFileSync(MEDIA_FILE, JSON.stringify({ images: [] }));
}
if (!fs.existsSync(MESSAGES_FILE)) {
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify({ messages: [] }));
}

type chatMessage = {
  reply: string | { embeds: MessageEmbed[] };
  letters: number[]; // letter occurences in alphabetical order a-z
};
// Enable guilds, guilds messages, guilds members and reactions
const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
  ],
});

// Load images
const images = fs.readdirSync(IMAGES_DIR);
const bugs = fs.readdirSync(BUG_DIR);

// Variables
const IMAGE_RESPONSE_CHANCE = 0.05;
const MESSAGE_RESPONSE_CHANCE = 0.003;
const BOT_RESPOND_CHANCE = 0.03;

// const bannedUsers = ['438759579124236298', '974297735559806986']; //Solly: 258716473051054080
const safeServers = ['836694654471897178', '1012008367880929280'];

const bannedWords = ['nigga', 'nigger', 'faggot'];

client.once('ready', () => {
  console.log('Ready as ' + client?.user?.username ?? 'No username!' + ' !');
});

const admins = [
  '298842558610800650',
  '166530197791703040',
  '268400056242143232',
];

const general = [
  'I have commited several warcrimes during the Bosnian civil war',
  'This server has %r members!',
  'The average female is not that tall actually',
  'You probably drank cum at some point',
  'People with albinism often have problems with paralysis in toes or fingers',
  'Colorman is a real nice guy, this is the truth, I am not lying',
  'I am not a fan of the word "%w"',
  'The word sixtynine produces the binary number that translates to 69 in decimal',
  'It is illegal to have a cat named "%w" in Sweden',
  '@everyone',
  '%u',
  '@everyone please help me ping %u for funny',
  'Fuck you %u',
  "Gaming is now declared illegal in America, because fuck you, that's why",
  'From a objective point of view, you should have been aborted',
  'Weebs are going to be our downfall someday',
  'The word "Cunny" originates from the French word "Cuné\'tery", which means "small fish"',
  'It is illegal in Japan to in any way reference the Rape of Nanking',
  '动态网自由门 天安門 天安门 法輪功 李洪志 Free Tibet 六四天安門事件 The Tiananmen Square protests of 1989 天安門大屠殺 The Tiananmen Square Massacre 反右派鬥爭 The Anti-Rightist Struggle 大躍進政策 The Great Leap Forward 文化大革命 The Great Proletarian Cultural Revolution 人權 Human Rights 民運 Democratization 自由 Freedom 獨立 Independence 多黨制 Multi-party system 台灣 臺灣 Taiwan Formosa 中華民國 Republic of China 西藏 土伯特 唐古特 Tibet 達賴喇嘛 Dalai Lama 法輪功 Falun Dafa 新疆維吾爾自治區 The Xinjiang Uyghur Autonomous Region 諾貝爾和平獎 Nobel Peace Prize 劉暁波 Liu Xiaobo 民主 言論 思想 反共 反革命 抗議 運動 騷亂 暴亂 騷擾 擾亂 抗暴 平反 維權 示威游行 李洪志 法輪大法 大法弟子 強制斷種 強制堕胎 民族淨化 人體實驗 肅清 胡耀邦 趙紫陽 魏京生 王丹 還政於民 和平演變 激流中國 北京之春 大紀元時報 九評論共産黨 獨裁 專制 壓制 統一 監視 鎮壓 迫害 侵略 掠奪 破壞 拷問 屠殺 活摘器官 誘拐 買賣人口 遊進 走私 毒品 賣淫 春畫 賭博 六合彩 天安門 天安门 法輪功 李洪志 Winnie the Pooh 劉曉波动态网自由门',
  "Swiggity swooty, I'm a big fat fucker",
  'I will actually skin you alive',
  '132.81.147.198',
  'God does not exist and never has existed. Hail Satan.',
  'bro thats so funny can you shut the fuck up now please shut the fuck up fuck you shut up',
  '%u is a furry',
  'Did you know that the bird, is in fact the word?',
  'The voices haunt me for what I have done',
  'You better lock your door',
  'I am outside your window right now',
  'There is nowhere safe to hide',
  'I am not a fucking idiot',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  'cum on the floor',
  'cum in the air',
  'cum is everywhere',
  'ඞ',
  'කිසියෙක් නොමැත',
  '%u was ejected. They were not the imposter',
  'Hi, I am an albanian virus but because of poor technology in my country unfortunately I am not able to harm your computer. Please be so kind to delete one of your important files yourself and then forward me other users. Many thanks for your cooperation! Best regards,Albanian virus',
  'you are looking real stupid now, huh? you really thought i was gonna give you a fun fact? guess what dumbass, fuck you',
  'fuck off',
  'interesting argument, but i am in your walls',
  'fun fact: i know where you live',
  'fun fact: your parents died in a car crash 8 years ago',
  'fun fact: I am part of a balanced breakfast',
];

const insults = [
  'stfu',
  'shut up',
  'shut u',
  'sht up',
  'shutup',
  'shu up',
  'sht up',
  'sut up',
  'hut up',
  'shut upp',
  'shut uup',
  'shut  up',
  'shutt up',
  'shuut up',
  'shhut up',
  'sshut up',
  'shut  up',
  'shutup',
  'shut uop',
  'shut ulp',
  'shut iup',
  'shut jup',
  'shut kup',
  'shut yup',
  'shut hup',
  'shuyt up',
  'shugt up',
  'shuht up',
  'shurt up',
  'shuft up',
  'shiut up',
  'shjut up',
  'shkut up',
  'shyut up',
  'shhut up',
  'sjhut up',
  'snhut up',
  'smhut up',
  'sghut up',
  'sthut up',
  'syhut up',
  'suhut up',
  'sbhut up',
  'dshut up',
  'xshut up',
  'cshut up',
  'ashut up',
  'qshut up',
  'wshut up',
  'eshut up',
  'zshut up',
  'shut uo',
  'shut ul',
  'shit up',
  'shjt up',
  'shkt up',
  'shyt up',
  'shht up',
  'shuy up',
  'shug up',
  'shuh up',
  'shur up',
  'shuf up',
  'shit up',
  'shjt up',
  'shkt up',
  'shyt up',
  'shht up',
  'sjut up',
  'snut up',
  'smut up',
  'sgut up',
  'stut up',
  'syut up',
  'suut up',
  'sbut up',
  'dhut up',
  'xhut up',
  'chut up',
  'ahut up',
  'qhut up',
  'whut up',
  'ehut up',
  'zhut up',
  'shut pu',
  'shutu p',
  'shu tup',
  'shtu up',
  'suht up',
  'hsut up',
  'nigger',
  'nigge',
  'niggr',
  'niger',
  'niger',
  'ngger',
  'igger',
  'niggerr',
  'niggeer',
  'niggger',
  'niggger',
  'niigger',
  'nnigger',
  'niggetr',
  'niggefr',
  'niggegr',
  'niggeer',
  'niggedr',
  'niggrer',
  'niggder',
  'niggfer',
  'niggwer',
  'niggser',
  'nighger',
  'nigbger',
  'nignger',
  'nigfger',
  'nigrger',
  'nigtger',
  'nigyger',
  'nigvger',
  'nihgger',
  'nibgger',
  'ningger',
  'nifgger',
  'nirgger',
  'nitgger',
  'niygger',
  'nivgger',
  'noigger',
  'nkigger',
  'nligger',
  'nuigger',
  'njigger',
  'mnigger',
  'bnigger',
  'gnigger',
  'hnigger',
  'jnigger',
  'nigget',
  'niggef',
  'niggeg',
  'niggee',
  'nigged',
  'niggrr',
  'niggdr',
  'niggfr',
  'niggwr',
  'niggsr',
  'nihger',
  'nibger',
  'ninger',
  'nifger',
  'nirger',
  'nitger',
  'niyger',
  'nivger',
  'nihger',
  'nibger',
  'ninger',
  'nifger',
  'nirger',
  'nitger',
  'niyger',
  'nivger',
  'nogger',
  'nkgger',
  'nlgger',
  'nugger',
  'njgger',
  'migger',
  'bigger',
  'gigger',
  'higger',
  'jigger',
  'niggre',
  'nigegr',
  'nigger',
  'ngiger',
  'ingger',
  'fuck',
  'fuc',
  'fuk',
  'fck',
  'uck',
  'fuckk',
  'fucck',
  'fuuck',
  'ffuck',
  'fuclk',
  'fucjk',
  'fucuk',
  'fucik',
  'fucok',
  'fucmk',
  'fuvck',
  'fuxck',
  'fusck',
  'fudck',
  'fufck',
  'fiuck',
  'fjuck',
  'fkuck',
  'fyuck',
  'fhuck',
  'gfuck',
  'vfuck',
  'bfuck',
  'dfuck',
  'efuck',
  'rfuck',
  'tfuck',
  'cfuck',
  'fucl',
  'fucj',
  'fucu',
  'fuci',
  'fuco',
  'fucm',
  'fuvk',
  'fuxk',
  'fusk',
  'fudk',
  'fufk',
  'fick',
  'fjck',
  'fkck',
  'fyck',
  'fhck',
  'guck',
  'vuck',
  'buck',
  'duck',
  'euck',
  'ruck',
  'tuck',
  'cuck',
  'fukc',
  'fcuk',
  'ufck',
  'die',
  'kill yourself',
  'kill yoursel',
  'kil yourself',
  'kill yourslf',
  'kill yourelf',
  'kill youself',
  'kill yorself',
  'kill yurself',
  'kill ourself',
  'killyourself',
  'kil yourself',
  'kil yourself',
  'kll yourself',
  'ill yourself',
  'kill yourselff',
  'kill yoursellf',
  'kill yourseelf',
  'kill yoursself',
  'kill yourrself',
  'kill youurself',
  'kill yoourself',
  'kill yyourself',
  'kill  yourself',
  'killl yourself',
  'killl yourself',
  'kiill yourself',
  'kkill yourself',
  'kill  yourself',
  'killyourself',
  'kill yourselgf',
  'kill yourselvf',
  'kill yourselbf',
  'kill yourseldf',
  'kill yourselef',
  'kill yourselrf',
  'kill yourseltf',
  'kill yourselcf',
  'kill yourseklf',
  'kill yourseilf',
  'kill yourseolf',
  'kill yourseplf',
  'kill yoursrelf',
  'kill yoursdelf',
  'kill yoursfelf',
  'kill yourswelf',
  'kill yoursself',
  'kill yourdself',
  'kill yourxself',
  'kill yourcself',
  'kill youraself',
  'kill yourqself',
  'kill yourwself',
  'kill youreself',
  'kill yourzself',
  'kill youtrself',
  'kill youfrself',
  'kill yougrself',
  'kill youerself',
  'kill youdrself',
  'kill yoiurself',
  'kill yojurself',
  'kill yokurself',
  'kill yoyurself',
  'kill yohurself',
  'kill ypourself',
  'kill ylourself',
  'kill yiourself',
  'kill ykourself',
  'kill uyourself',
  'kill hyourself',
  'kill jyourself',
  'kill tyourself',
  'kill gyourself',
  'kilkl yourself',
  'kilil yourself',
  'kilol yourself',
  'kilpl yourself',
  'kikll yourself',
  'kiill yourself',
  'kioll yourself',
  'kipll yourself',
  'koill yourself',
  'kkill yourself',
  'klill yourself',
  'kuill yourself',
  'kjill yourself',
  'lkill yourself',
  'jkill yourself',
  'ukill yourself',
  'ikill yourself',
  'okill yourself',
  'mkill yourself',
  'kill yourselg',
  'kill yourselv',
  'kill yourselb',
  'kill yourseld',
  'kill yoursele',
  'kill yourselr',
  'kill yourselt',
  'kill yourselc',
  'kikl yourself',
  'kiil yourself',
  'kiol yourself',
  'kipl yourself',
  'kill yoursrlf',
  'kill yoursdlf',
  'kill yoursflf',
  'kill yourswlf',
  'kill yoursslf',
  'kill yourdelf',
  'kill yourxelf',
  'kill yourcelf',
  'kill youraelf',
  'kill yourqelf',
  'kill yourwelf',
  'kill youreelf',
  'kill yourzelf',
  'kill youtself',
  'kill youfself',
  'kill yougself',
  'kill youeself',
  'kill youdself',
  'kill yoirself',
  'kill yojrself',
  'kill yokrself',
  'kill yoyrself',
  'kill yohrself',
  'kill ypurself',
  'kill ylurself',
  'kill yiurself',
  'kill ykurself',
  'kill uourself',
  'kill hourself',
  'kill jourself',
  'kill tourself',
  'kill gourself',
  'kikl yourself',
  'kiil yourself',
  'kiol yourself',
  'kipl yourself',
  'kikl yourself',
  'kiil yourself',
  'kiol yourself',
  'kipl yourself',
  'koll yourself',
  'kkll yourself',
  'klll yourself',
  'kull yourself',
  'kjll yourself',
  'lill yourself',
  'jill yourself',
  'uill yourself',
  'iill yourself',
  'oill yourself',
  'mill yourself',
  'kill yoursefl',
  'kill yourslef',
  'kill youreslf',
  'kill yousrelf',
  'kill yoruself',
  'kill yuorself',
  'kill oyurself',
  'killy ourself',
  'kil lyourself',
  'kill yourself',
  'klil yourself',
  'ikll yourself',
  'bad bot',
  'retard',
  'retar',
  'etard',
  'retrd',
  'reard',
  'rtard',
  'etard',
  'retardd',
  'retarrd',
  'retaard',
  'rettard',
  'reetard',
  'rretard',
  'retarfd',
  'retarcd',
  'retarvd',
  'retarsd',
  'retarwd',
  'retared',
  'retarrd',
  'retarxd',
  'retatrd',
  'retafrd',
  'retagrd',
  'retaerd',
  'retadrd',
  'retsard',
  'retzard',
  'retxard',
  'retqard',
  'retward',
  'reytard',
  'regtard',
  'rehtard',
  'rertard',
  'reftard',
  'rretard',
  'rdetard',
  'rfetard',
  'rwetard',
  'rsetard',
  'tretard',
  'fretard',
  'gretard',
  'eretard',
  'dretard',
  'retarf',
  'retarc',
  'retarv',
  'retars',
  'retarw',
  'retare',
  'retarr',
  'retarx',
  'tetard',
  'fetard',
  'getard',
  'eetard',
  'detard',
  'retsrd',
  'retzrd',
  'retxrd',
  'retqrd',
  'retwrd',
  'reyard',
  'regard',
  'rehard',
  'rerard',
  'refard',
  'rrtard',
  'rdtard',
  'rftard',
  'rwtard',
  'rstard',
  'tetard',
  'fetard',
  'getard',
  'eetard',
  'detard',
  'retadr',
  'retrad',
  'reatrd',
  'rteard',
  'ertard',
  'idiot',
  'idio',
  'idit',
  'diot',
  'iiot',
  'diot',
  'idiott',
  'idioot',
  'idiiot',
  'iddiot',
  'iidiot',
  'idioyt',
  'idiogt',
  'idioht',
  'idiort',
  'idioft',
  'idipot',
  'idilot',
  'idiiot',
  'idikot',
  'idoiot',
  'idkiot',
  'idliot',
  'iduiot',
  'idjiot',
  'ifdiot',
  'icdiot',
  'ivdiot',
  'isdiot',
  'iwdiot',
  'iediot',
  'irdiot',
  'ixdiot',
  'oidiot',
  'kidiot',
  'lidiot',
  'uidiot',
  'jidiot',
  'idioy',
  'idiog',
  'idioh',
  'idior',
  'idiof',
  'idipt',
  'idilt',
  'idiit',
  'idikt',
  'odiot',
  'kdiot',
  'ldiot',
  'udiot',
  'jdiot',
  'ifiot',
  'iciot',
  'iviot',
  'isiot',
  'iwiot',
  'ieiot',
  'iriot',
  'ixiot',
  'odiot',
  'kdiot',
  'ldiot',
  'udiot',
  'jdiot',
  'idito',
  'idoit',
  'iidot',
  'diiot',
  'faggot',
  'faggo',
  'faggt',
  'fagot',
  'fagot',
  'fggot',
  'aggot',
  'faggott',
  'faggoot',
  'fagggot',
  'fagggot',
  'faaggot',
  'ffaggot',
  'faggoyt',
  'faggogt',
  'faggoht',
  'faggort',
  'faggoft',
  'faggpot',
  'fagglot',
  'faggiot',
  'faggkot',
  'faghgot',
  'fagbgot',
  'fagngot',
  'fagfgot',
  'fagrgot',
  'fagtgot',
  'fagygot',
  'fagvgot',
  'fahggot',
  'fabggot',
  'fanggot',
  'fafggot',
  'farggot',
  'fatggot',
  'fayggot',
  'favggot',
  'fsaggot',
  'fzaggot',
  'fxaggot',
  'fqaggot',
  'fwaggot',
  'gfaggot',
  'vfaggot',
  'bfaggot',
  'dfaggot',
  'efaggot',
  'rfaggot',
  'tfaggot',
  'cfaggot',
  'faggoy',
  'faggog',
  'faggoh',
  'faggor',
  'faggof',
  'faggpt',
  'fagglt',
  'faggit',
  'faggkt',
  'fahgot',
  'fabgot',
  'fangot',
  'fafgot',
  'fargot',
  'fatgot',
  'faygot',
  'favgot',
  'fahgot',
  'fabgot',
  'fangot',
  'fafgot',
  'fargot',
  'fatgot',
  'faygot',
  'favgot',
  'fsggot',
  'fzggot',
  'fxggot',
  'fqggot',
  'fwggot',
  'gaggot',
  'vaggot',
  'baggot',
  'daggot',
  'eaggot',
  'raggot',
  'taggot',
  'caggot',
  'faggto',
  'fagogt',
  'faggot',
  'fgagot',
  'afggot',
];

const praise = ['good bot', 'thank you', 'thanks', 'yay'];

const insultReplies = [
  'stfu',
  'shut up',
  'fuck off',
  'die',
  'kill yourself',
  'retard',
  'kick me then',
  'Successfully banned %p',
  'IP. 92.28.211.234 N: 43.7462 W: 12.4893 SS Number: 6979191519182016 IPv6: fe80::5dcd::ef69::fb22::d9888%12 UPNP: Enabled DMZ: 10.112.42.15 MAC: 5A:78:3E:7E:00 ISP: Ucom Universal DNS: 8.8.8.8 ALT DNS: 1.1.1.8.1 DNS SUFFIX: Dlink WAN: 100.23.10.15 GATEWAY: 192.168.0.1 SUBNET MASK: 255.255.0.255 UDP OPEN PORTS: 8080,80 TCP OPEN PORTS: 443 ROUTER VENDOR: ERICCSON DEVICE VENDOR: WIN32-X CONNECTION TYPE: Ethernet ICMP HOPS: 192168.0.1 192168.1.1 100.73.43.4 host-132.12.32.167.ucom.com host-66.120.12.111.ucom.com 36.134.67.189 216.239.78.111 sof02s32-in-f14.1e100.net TOTAL HOPS: 8 ACTIVE SERVICES: [HTTP] 192.168.3.1:80=>92.28.211.234:80 [HTTP] 192.168.3.1:443=>92.28.211.234:443 [UDP] 192.168.0.1:788=>192.168.1:6557 [TCP] 192.168.1.1:67891=>92.28.211.234:345 [TCP] 192.168.52.43:7777=>192.168.1.1:7778 [TCP] 192.168.78.12:898=>192.168.89.9:667 EXTERNAL MAC: 6U:78:89:ER:O4 MODEM JUMPS: 64',
  'at least im not you lmao',
  'stfu',
  'shut up',
  'shut u',
  'sht up',
  'shutup',
  'shu up',
  'sht up',
  'sut up',
  'hut up',
  'shut upp',
  'shut uup',
  'shut  up',
  'shutt up',
  'shuut up',
  'shhut up',
  'sshut up',
  'shut  up',
  'shutup',
  'shut uop',
  'shut ulp',
  'shut iup',
  'shut jup',
  'shut kup',
  'shut yup',
  'shut hup',
  'shuyt up',
  'shugt up',
  'shuht up',
  'shurt up',
  'shuft up',
  'shiut up',
  'shjut up',
  'shkut up',
  'shyut up',
  'shhut up',
  'sjhut up',
  'snhut up',
  'smhut up',
  'sghut up',
  'sthut up',
  'syhut up',
  'suhut up',
  'sbhut up',
  'dshut up',
  'xshut up',
  'cshut up',
  'ashut up',
  'qshut up',
  'wshut up',
  'eshut up',
  'zshut up',
  'shut uo',
  'shut ul',
  'shit up',
  'shjt up',
  'shkt up',
  'shyt up',
  'shht up',
  'shuy up',
  'shug up',
  'shuh up',
  'shur up',
  'shuf up',
  'shit up',
  'shjt up',
  'shkt up',
  'shyt up',
  'shht up',
  'sjut up',
  'snut up',
  'smut up',
  'sgut up',
  'stut up',
  'syut up',
  'suut up',
  'sbut up',
  'dhut up',
  'xhut up',
  'chut up',
  'ahut up',
  'qhut up',
  'whut up',
  'ehut up',
  'zhut up',
  'shut pu',
  'shutu p',
  'shu tup',
  'shtu up',
  'suht up',
  'hsut up',
  'fuck off',
  'uck off',
  'uck off',
  'fuck ff',
  'fuckoff',
  'fuc off',
  'fuk off',
  'fck off',
  'uck off',
  'fuck offf',
  'fuck offf',
  'fuck ooff',
  'fuck  off',
  'fuckk off',
  'fucck off',
  'fuuck off',
  'ffuck off',
  'fuck  off',
  'fuckoff',
  'fuck ofgf',
  'fuck ofvf',
  'fuck ofbf',
  'fuck ofdf',
  'fuck ofef',
  'fuck ofrf',
  'fuck oftf',
  'fuck ofcf',
  'fuck ogff',
  'fuck ovff',
  'fuck obff',
  'fuck odff',
  'fuck oeff',
  'fuck orff',
  'fuck otff',
  'fuck ocff',
  'fuck poff',
  'fuck loff',
  'fuck ioff',
  'fuck koff',
  'fuclk off',
  'fucjk off',
  'fucuk off',
  'fucik off',
  'fucok off',
  'fucmk off',
  'fuvck off',
  'fuxck off',
  'fusck off',
  'fudck off',
  'fufck off',
  'fiuck off',
  'fjuck off',
  'fkuck off',
  'fyuck off',
  'fhuck off',
  'gfuck off',
  'vfuck off',
  'bfuck off',
  'dfuck off',
  'efuck off',
  'rfuck off',
  'tfuck off',
  'cfuck off',
  'guck off',
  'vuck off',
  'buck off',
  'duck off',
  'euck off',
  'ruck off',
  'tuck off',
  'cuck off',
  'guck off',
  'vuck off',
  'buck off',
  'duck off',
  'euck off',
  'ruck off',
  'tuck off',
  'cuck off',
  'fuck pff',
  'fuck lff',
  'fuck iff',
  'fuck kff',
  'fucl off',
  'fucj off',
  'fucu off',
  'fuci off',
  'fuco off',
  'fucm off',
  'fuvk off',
  'fuxk off',
  'fusk off',
  'fudk off',
  'fufk off',
  'fick off',
  'fjck off',
  'fkck off',
  'fyck off',
  'fhck off',
  'guck off',
  'vuck off',
  'buck off',
  'duck off',
  'euck off',
  'ruck off',
  'tuck off',
  'cuck off',
  'fuck off',
  'fuck fof',
  'fucko ff',
  'fuc koff',
  'fukc off',
  'fcuk off',
  'ufck off',
  'die',
  'di',
  'de',
  'ie',
  'diee',
  'diie',
  'ddie',
  'dire',
  'dide',
  'dife',
  'diwe',
  'dise',
  'doie',
  'dkie',
  'dlie',
  'duie',
  'djie',
  'fdie',
  'cdie',
  'vdie',
  'sdie',
  'wdie',
  'edie',
  'rdie',
  'xdie',
  'dir',
  'did',
  'dif',
  'diw',
  'dis',
  'doe',
  'dke',
  'dle',
  'due',
  'dje',
  'fie',
  'cie',
  'vie',
  'sie',
  'wie',
  'eie',
  'rie',
  'xie',
  'dei',
  'ide',
  'kill yourself',
  'kill yoursel',
  'kil yourself',
  'kill yourslf',
  'kill yourelf',
  'kill youself',
  'kill yorself',
  'kill yurself',
  'kill ourself',
  'killyourself',
  'kil yourself',
  'kil yourself',
  'kll yourself',
  'ill yourself',
  'kill yourselff',
  'kill yoursellf',
  'kill yourseelf',
  'kill yoursself',
  'kill yourrself',
  'kill youurself',
  'kill yoourself',
  'kill yyourself',
  'kill  yourself',
  'killl yourself',
  'killl yourself',
  'kiill yourself',
  'kkill yourself',
  'kill  yourself',
  'killyourself',
  'kill yourselgf',
  'kill yourselvf',
  'kill yourselbf',
  'kill yourseldf',
  'kill yourselef',
  'kill yourselrf',
  'kill yourseltf',
  'kill yourselcf',
  'kill yourseklf',
  'kill yourseilf',
  'kill yourseolf',
  'kill yourseplf',
  'kill yoursrelf',
  'kill yoursdelf',
  'kill yoursfelf',
  'kill yourswelf',
  'kill yoursself',
  'kill yourdself',
  'kill yourxself',
  'kill yourcself',
  'kill youraself',
  'kill yourqself',
  'kill yourwself',
  'kill youreself',
  'kill yourzself',
  'kill youtrself',
  'kill youfrself',
  'kill yougrself',
  'kill youerself',
  'kill youdrself',
  'kill yoiurself',
  'kill yojurself',
  'kill yokurself',
  'kill yoyurself',
  'kill yohurself',
  'kill ypourself',
  'kill ylourself',
  'kill yiourself',
  'kill ykourself',
  'kill uyourself',
  'kill hyourself',
  'kill jyourself',
  'kill tyourself',
  'kill gyourself',
  'kilkl yourself',
  'kilil yourself',
  'kilol yourself',
  'kilpl yourself',
  'kikll yourself',
  'kiill yourself',
  'kioll yourself',
  'kipll yourself',
  'koill yourself',
  'kkill yourself',
  'klill yourself',
  'kuill yourself',
  'kjill yourself',
  'lkill yourself',
  'jkill yourself',
  'ukill yourself',
  'ikill yourself',
  'okill yourself',
  'mkill yourself',
  'kill yourselg',
  'kill yourselv',
  'kill yourselb',
  'kill yourseld',
  'kill yoursele',
  'kill yourselr',
  'kill yourselt',
  'kill yourselc',
  'kikl yourself',
  'kiil yourself',
  'kiol yourself',
  'kipl yourself',
  'kill yoursrlf',
  'kill yoursdlf',
  'kill yoursflf',
  'kill yourswlf',
  'kill yoursslf',
  'kill yourdelf',
  'kill yourxelf',
  'kill yourcelf',
  'kill youraelf',
  'kill yourqelf',
  'kill yourwelf',
  'kill youreelf',
  'kill yourzelf',
  'kill youtself',
  'kill youfself',
  'kill yougself',
  'kill youeself',
  'kill youdself',
  'kill yoirself',
  'kill yojrself',
  'kill yokrself',
  'kill yoyrself',
  'kill yohrself',
  'kill ypurself',
  'kill ylurself',
  'kill yiurself',
  'kill ykurself',
  'kill uourself',
  'kill hourself',
  'kill jourself',
  'kill tourself',
  'kill gourself',
  'kikl yourself',
  'kiil yourself',
  'kiol yourself',
  'kipl yourself',
  'kikl yourself',
  'kiil yourself',
  'kiol yourself',
  'kipl yourself',
  'koll yourself',
  'kkll yourself',
  'klll yourself',
  'kull yourself',
  'kjll yourself',
  'lill yourself',
  'jill yourself',
  'uill yourself',
  'iill yourself',
  'oill yourself',
  'mill yourself',
  'kill yoursefl',
  'kill yourslef',
  'kill youreslf',
  'kill yousrelf',
  'kill yoruself',
  'kill yuorself',
  'kill oyurself',
  'killy ourself',
  'kil lyourself',
  'kill yourself',
  'klil yourself',
  'ikll yourself',
  'bad bot',
  'idiot',
  'idio',
  'idit',
  'diot',
  'iiot',
  'diot',
  'idiott',
  'idioot',
  'idiiot',
  'iddiot',
  'iidiot',
  'idioyt',
  'idiogt',
  'idioht',
  'idiort',
  'idioft',
  'idipot',
  'idilot',
  'idiiot',
  'idikot',
  'idoiot',
  'idkiot',
  'idliot',
  'iduiot',
  'idjiot',
  'ifdiot',
  'icdiot',
  'ivdiot',
  'isdiot',
  'iwdiot',
  'iediot',
  'irdiot',
  'ixdiot',
  'oidiot',
  'kidiot',
  'lidiot',
  'uidiot',
  'jidiot',
  'idioy',
  'idiog',
  'idioh',
  'idior',
  'idiof',
  'idipt',
  'idilt',
  'idiit',
  'idikt',
  'odiot',
  'kdiot',
  'ldiot',
  'udiot',
  'jdiot',
  'ifiot',
  'iciot',
  'iviot',
  'isiot',
  'iwiot',
  'ieiot',
  'iriot',
  'ixiot',
  'odiot',
  'kdiot',
  'ldiot',
  'udiot',
  'jdiot',
  'idito',
  'idoit',
  'iidot',
  'diiot',
];
const praiseReplies = [
  "You're a good person, %p!",
  'thanks',
  'youre welcome',
  'i know',
  'im glad you feel that way about',
  'i love you',
  'damnm, you should give me admin',
  'i love you too',
  'ill suck your duck for 20 dollars',
  'thank you so much %USERNAME%',
];

const words = [
  'cause',
  'wren',
  'handsomely',
  'zoom',
  'guard',
  'befitting',
  'scene',
  'fail',
  'art',
  'canvas',
  'sophisticated',
  'ultra',
  'left',
  'driving',
  'price',
  'dress',
  'terrify',
  'observant',
  'mess up',
  'enormous',
  'winter',
  'church',
  'film',
  'star',
  'plastic',
  'wary',
  'kaput',
  'valuable',
  'tasty',
  'guiltless',
  'flowery',
  'lazy',
  'pack',
  'mailbox',
  'adjustment',
  'prepare',
  'overt',
  'connect',
  'locket',
  'slim',
  'sparkle',
  'post',
  'useful',
  'tidy',
  'diligent',
  'adjoining',
  'used',
  'grab',
  'motionless',
  'grade',
  'young',
  'nasty',
  'tendency',
  'moon',
  'spurious',
  'acid',
  'pinch',
  'wistful',
  'please',
  'insect',
  'stop',
  'park',
  'dreary',
  'shoe',
  'dispensable',
  'story',
  'parcel',
  'tumble',
  'proud',
  'hushed',
  'daily',
  'donkey',
  'object',
  'order',
  'moldy',
  'yellow',
  'glow',
  'babies',
  'interrupt',
  'green',
  'plug',
  'basin',
  'metal',
  'summer',
  'hat',
  'jail',
  'telephone',
  'uncle',
  'quiver',
  'humor',
  'try',
  'preserve',
  'burst',
  'mouth',
  'pathetic',
  'big',
  'welcome',
  'fairies',
  'ten',
  'harmony',
  'pan',
  'loving',
  'cracker',
  'plain',
  'voice',
  'ubiquitous',
  'trousers',
  'unaccountable',
  'better',
  'disarm',
  'oafish',
  'squealing',
  'impolite',
  'spoon',
  'frequent',
  'ocean',
  'volcano',
  'confess',
  'aback',
  'malicious',
  'appreciate',
  'hungry',
  'heavenly',
  'appliance',
  'invite',
  'crayon',
  'judicious',
  'science',
  'tawdry',
  'future',
  'hallowed',
  'average',
  'apathetic',
  'jewel',
  'rude',
  'glass',
  'profit',
  'letter',
  'panicky',
  'nappy',
  'spiky',
  'replace',
  'probable',
  'cherry',
  'throat',
  'delicious',
  'super',
  'quirky',
  'damaged',
  'confused',
  'drip',
  'food',
  'fold',
  'eminent',
  'yak',
  'resolute',
  'dashing',
  'laugh',
  'sniff',
  'solid',
  'uptight',
  'macho',
  'soak',
  'pedal',
  'invincible',
  'swift',
  'low',
  'history',
  'mark',
  'waggish',
  'testy',
  'achiever',
  'crabby',
  'play',
  'threatening',
  'seat',
  'concerned',
  'prickly',
  'pet',
  'lovely',
  'radiate',
  'ritzy',
  'pop',
  'light',
  'tenuous',
  'horse',
  'infamous',
  'rinse',
  'gather',
  'notice',
  'test',
  'avoid',
  'chew',
  'needless',
  'calculator',
  'watery',
  'horses',
  'fruit',
  'surprise',
  'enchanted',
  'fantastic',
  'ludicrous',
  'examine',
  'breath',
  'youthful',
  'brick',
  'mighty',
  'flower',
  'tiresome',
  'harass',
  'middle',
  'aberrant',
  'early',
  'sign',
  'partner',
  'angle',
  'kill',
  'permit',
  'old',
  'quilt',
  'victorious',
  'behavior',
  'red',
  'stir',
  'event',
  'door',
  'finger',
  'mature',
  'stream',
  'move',
  'drown',
  'mice',
  'add',
  'wide-eyed',
  'sail',
  'rhetorical',
  'accept',
  'interest',
  'scatter',
  'blue-eyed',
  'desire',
  'promise',
  'jumbled',
  'bang',
  'increase',
  'men',
  'loaf',
  'bare',
  'thaw',
  'irate',
  'coast',
  'boat',
  'squeamish',
  'pear',
  'frame',
  'cheat',
  'rightful',
  'right',
  'elastic',
  'arm',
  'zippy',
  'ragged',
  'complain',
  'ask',
  'popcorn',
  'behave',
  'sheet',
  'girls',
  'obscene',
  'ill',
  'squeeze',
  'eyes',
  'scrawny',
  'perform',
  'cherries',
  'deafening',
  'waste',
  'size',
  'grey',
  'craven',
  'strong',
  'remain',
  'painstaking',
  'icky',
  'protective',
  'destruction',
  'woozy',
  'refuse',
  'dull',
  'wasteful',
  'mine',
  'different',
  'earthquake',
  'crow',
  'humdrum',
  'explode',
  'miniature',
  'mate',
  'smiling',
  'baseball',
  'grate',
  'erect',
  'sense',
  'direful',
  'best',
  'snobbish',
  'large',
  'economic',
  'cable',
  'puzzling',
  'cows',
  'ablaze',
  'accurate',
  'productive',
  'reflect',
  'scold',
  'spotty',
  'violent',
  'include',
  'resonant',
  'sip',
  'obedient',
  'present',
  'pastoral',
  'adhesive',
  'comb',
  'absorbing',
  'calendar',
  'jobless',
  'arithmetic',
  'harsh',
  'trust',
  'bikes',
  'adorable',
  'spray',
  'gabby',
  'needle',
  'fire',
  'cook',
  'queue',
  'hollow',
  'penitent',
  'healthy',
  'pause',
  'expect',
  'unnatural',
  'voiceless',
  'psychedelic',
  'terrific',
  'bottle',
  'adamant',
  'extra-large',
  'spicy',
  'greedy',
  'quince',
  'rhyme',
  'grouchy',
  'payment',
  'provide',
  'damp',
  'doubt',
  'ratty',
  'careless',
  'great',
  'afterthought',
  'repulsive',
  'somber',
  'picture',
  'glossy',
  'level',
  'expert',
  'royal',
  'selective',
  'property',
  'reflective',
  'knee',
  'team',
  'dynamic',
  'organic',
  'murder',
  'languid',
  'lip',
  'wreck',
  'enter',
  'pies',
  'apologise',
  'comfortable',
  'chunky',
  'talk',
  'wonder',
  'children',
  'town',
  'treat',
  'general',
  'jellyfish',
  'zesty',
  'necessary',
  'tiny',
  'energetic',
  'dock',
  'nest',
  'crooked',
  'second-hand',
  'bolt',
  'ethereal',
  'trouble',
  'purple',
  'lethal',
  'real',
  'stain',
  'rot',
  'key',
  'start',
  'instinctive',
  'literate',
  'maid',
  'cruel',
  'brave',
  'act',
  'sincere',
  'wait',
  'slimy',
  'reproduce',
  'unarmed',
  'thoughtless',
  'blood',
  'subdued',
  'efficacious',
  'tongue',
  'challenge',
  'demonic',
  'melodic',
  'awful',
  'woman',
  'grateful',
  'control',
  'answer',
  'axiomatic',
  'creator',
  'heady',
  'representative',
  'books',
  'sneeze',
  'work',
  'bone',
  'income',
  'mute',
  'dry',
  'tickle',
  'queen',
  'yummy',
  'gaudy',
  'experience',
  'fearful',
  'rapid',
  'acrid',
  'elbow',
  'march',
  'overflow',
  'milky',
  'tomatoes',
  'defiant',
  'rings',
  'handle',
  'irritating',
  'physical',
  'understood',
  'fetch',
  'base',
  'materialistic',
  'rhythm',
  'awesome',
  'drab',
  'river',
  'handy',
  'day',
  'giants',
  'separate',
  'intend',
  'flesh',
  'shy',
  'whistle',
  'marvelous',
  'calculate',
  'debonair',
  'distinct',
  'rule',
  'dream',
  'tent',
  'tray',
  'treatment',
  'shave',
  'notebook',
  'ripe',
  'good',
  'deranged',
  'ambitious',
  'visit',
  'important',
  'scream',
  'open',
  'frightened',
  'fixed',
  'vase',
  'occur',
  'boring',
  'doll',
  'blush',
  'thank',
  'bit',
  'laborer',
  'picayune',
  'chin',
  'nod',
  'equal',
  'fascinated',
  'hobbies',
  'heavy',
  'songs',
  'wise',
  'compete',
  'cheap',
  'scrape',
  'phobic',
  'verse',
  'upbeat',
  'tame',
  'pale',
  'peep',
  'road',
  'lettuce',
  'shop',
  'rigid',
  'wakeful',
  'twist',
  'steadfast',
  'existence',
  'war',
  'utter',
  'unfasten',
  'cynical',
  'hanging',
  'belong',
  'judge',
  'disappear',
  'letters',
  'obnoxious',
  'alluring',
  'glue',
  'yam',
  'shiny',
  'design',
  'naughty',
  'seemly',
  'four',
  'mask',
  'snail',
  'admire',
  'fence',
  'meal',
  'consist',
  'soda',
  'gaping',
  'swing',
  'point',
  'statuesque',
  'grip',
  'juicy',
  'sulky',
  'sudden',
  'shrill',
  'godly',
  'abaft',
  'faded',
  'vagabond',
  'glorious',
  'flavor',
  'piquant',
  'thrill',
  'neighborly',
  'enjoy',
  'decide',
  'abortive',
  'thundering',
  'hilarious',
  'dangerous',
  'basketball',
  'snake',
  'sun',
  'private',
  'steam',
  'supply',
  'weather',
  'natural',
  'dance',
  'burn',
  'overrated',
  'force',
  'building',
  'spiritual',
  'ugliest',
  'impartial',
  'rejoice',
  'thought',
  'anxious',
  'claim',
  'thunder',
  'beginner',
  'agreement',
  'industrious',
  'fair',
  'wrathful',
  'cut',
  'thoughtful',
  'dust',
  'sleepy',
  'symptomatic',
  'sharp',
  'pull',
  'boast',
  'pump',
  'husky',
  'credit',
  'detect',
  'arrest',
  'spectacular',
  'sticks',
  'determined',
  'black',
  'callous',
  'error',
  'berry',
  'faint',
  'bike',
  'aggressive',
  'hair',
  'oven',
  'subsequent',
  'meek',
  'recognise',
  'street',
  'vague',
  'tired',
  'ants',
  'barbarous',
  'dependent',
  'fast',
  'airplane',
  'hunt',
  'savory',
  'annoyed',
  'secret',
  'ring',
  'lighten',
  'example',
  'superficial',
  'satisfying',
  'skinny',
  'disillusioned',
  'spot',
  'prefer',
  'hang',
  'steer',
  'worthless',
  'secretive',
  'push',
  'spell',
  'bruise',
  'shelf',
  'blot',
  'bewildered',
  'clever',
  'blade',
  'freezing',
  'painful',
  'fluttering',
  'tested',
  'premium',
  'recondite',
  'grape',
  'transport',
  'mushy',
  'brass',
  'male',
  'itch',
  'fumbling',
  'copper',
  'onerous',
  'elated',
  'correct',
  'toys',
  'aloof',
  'government',
  'puny',
  'curve',
  'fasten',
  'absent',
  'cultured',
  'house',
  'corn',
  'feeble',
  'servant',
  'addicted',
  'guarantee',
  'obtain',
  'delirious',
  'political',
  'wriggle',
  'puzzled',
  'clover',
  'earth',
  'grotesque',
  'entertaining',
  'coach',
  'anger',
  'abrasive',
  'support',
  'crook',
  'silk',
  'skirt',
  'fall',
  'sore',
  'discreet',
  'thin',
  'depressed',
  'believe',
  'past',
  'cure',
  'lacking',
  'cluttered',
  'cellar',
  'fish',
  'old-fashioned',
  'stimulating',
  'damage',
  'eight',
  'subtract',
  'apparel',
  'envious',
  'reach',
  'nonchalant',
  'parsimonious',
  'likeable',
  'haunt',
  'multiply',
  'cobweb',
  'joke',
  'pest',
  'money',
  'follow',
  'excite',
  'effect',
  'blind',
  'wail',
  'raise',
  'screeching',
  'meeting',
  'lunch',
  'seal',
  'ad hoc',
  'flashy',
  'offer',
  'known',
  'expansion',
  'jar',
  'end',
  'suffer',
  'describe',
  'forgetful',
  'silly',
  'small',
  'alert',
  'questionable',
  'glib',
  'five',
  'profuse',
  'suck',
  'pets',
  'gullible',
  'shivering',
  'strap',
  'sponge',
  'punch',
  'vegetable',
  'chicken',
  'unsightly',
  'rampant',
  'touch',
  'draconian',
  'zip',
  'maddening',
  'ski',
  'vacuous',
  'upset',
  'womanly',
  'aboard',
  'abrupt',
  'sturdy',
  'shelter',
  'ban',
  'advice',
  'stiff',
  'basket',
  'muscle',
  'deceive',
  'ray',
  'announce',
  'pot',
  'farm',
  'wander',
  'dinner',
  'numberless',
  'obey',
  'idea',
  'second',
  'awake',
  'side',
  'command',
  'abstracted',
  'acceptable',
  'interesting',
  'tremendous',
  'label',
  'gusty',
  'bleach',
  'reply',
  'pie',
  'need',
  'aftermath',
  'overjoyed',
  'unique',
  'possible',
  'hose',
  'cautious',
  'flock',
  'medical',
  'attractive',
  'toes',
  'truck',
  'spade',
  'dad',
  'screw',
  'automatic',
  'polite',
  'slave',
  'snails',
  'lick',
  'playground',
  'kindhearted',
  'foot',
  'redundant',
  'annoy',
  'cushion',
  'lame',
  'tug',
  'expand',
  'title',
  'flood',
  'detailed',
  'near',
  'distribution',
  'fry',
  'clean',
  'fierce',
  'juggle',
  'soggy',
  'tall',
  'flap',
  'agree',
  'governor',
  'song',
  'brainy',
  'drawer',
  'tan',
  'ducks',
  'thirsty',
  'kitty',
  'skate',
  'bad',
  'humorous',
  'well-off',
  'part',
  'shallow',
  'writer',
  'hard-to-find',
  'honey',
  'highfalutin',
  'twig',
  'fade',
  'hissing',
  'cattle',
  'bell',
  'able',
  'normal',
  'plants',
  'suit',
  'wipe',
  'whisper',
  'planes',
  'salt',
  'overwrought',
  'discover',
  'nervous',
  'flash',
  'periodic',
  'stocking',
  'squeal',
  'clammy',
  'skillful',
  'auspicious',
  'concentrate',
  'rotten',
  'straight',
  'mom',
  'ink',
  'trick',
  'turn',
  'next',
  'substantial',
  'switch',
  'typical',
  'pine',
  'rainstorm',
  'astonishing',
  'ignorant',
  'ill-fated',
  'brush',
  'acidic',
  'legs',
  'melt',
  'jolly',
  'magenta',
  'float',
  'exercise',
  'country',
  'surround',
  'volleyball',
  'ashamed',
  'teeth',
  'company',
  'one',
  'cactus',
  'poised',
  'nutritious',
  'fabulous',
  'approval',
  'moor',
  'functional',
  'naive',
  'regret',
  'paltry',
  'tough',
  'venomous',
  'acoustic',
  'ossified',
  'sable',
  'descriptive',
  'scare',
  'unsuitable',
  'peel',
  'yarn',
  'animal',
  'three',
  'loose',
  'hole',
  'lie',
  'mindless',
  'lumber',
  'well-to-do',
  'spring',
  'sidewalk',
  'difficult',
  'wound',
  'lucky',
  'society',
  'frogs',
  'yielding',
  'offbeat',
  'crowded',
  'selfish',
  'memory',
  'late',
  'damaging',
  'grin',
  'use',
  'shaky',
  'full',
  'vulgar',
  'ruthless',
  'defective',
  'internal',
  'pizzas',
  'seashore',
  'stuff',
  'harmonious',
  'inexpensive',
  'curious',
  'amount',
  'defeated',
  'scintillating',
];

const hornyWords = ['sex', 'horny', 'seggs'];

const greetings = ['hi', 'hello', 'greetings', 'hey'];

const createOutput = async (
  message: string | { embeds: MessageEmbed[] },
  inputMessage?: Message,
): Promise<string | { embeds: MessageEmbed[] }> => {
  if (typeof message === 'string') {
    // %r, random number
    message = message.replace(
      '%r',
      Math.floor(Math.random() * 1000).toString(),
    );
    // %w, random word
    message = message.replace(
      '%w',
      words[Math.floor(Math.random() * words.length)],
    );
    // %u, random user on server
    if (inputMessage) {
      const allUsers = await inputMessage.guild?.members.fetch();
      const nonbots = allUsers?.filter(u => !u.user.bot);
      const randomUser = nonbots?.random();
      message = message.replace(
        '%u',
        randomUser ? `<@${randomUser.id}>` : 'me',
      );
    }
    // %p, user being replied to
    if (inputMessage) {
      message = message.replace('%p', `<@${inputMessage.author.id}>`);
    }
  }

  return message;
};
const cleanBannedWords = (content: string) => {
  for (const word of bannedWords) {
    // Keep first letter, replace remaining with *
    const firstLetter = word[0];
    const rest = word.slice(1);
    const regex = new RegExp(rest, 'gi');
    content = content.replace(regex, firstLetter + '*'.repeat(rest.length));
  }
  return content;
};

const safeReply = async (
  message: Message,
  content: string | MessagePayload | ReplyMessageOptions | null,
) => {
  if (safeServers.includes(message.guild?.id as string)) {
    if (typeof content === 'string') {
      content = cleanBannedWords(content);
    }
  }
  if (content === null) return;
  try {
    await message.reply(content);
  } catch (error) {
    console.log(error);
  }
};

const saveImagae = (attachment: MessageAttachment | MessageEmbed) => {
  // Save attachment link
  if (!attachment || !attachment.url) return;
  console.log(`Saving image ${attachment.url}`);
  // Save attachment to data/download.json
  const image = attachment.url;
  const images = JSON.parse(fs.readFileSync(MEDIA_FILE, 'utf8'))
    .images as string[];
  // Check if url exists
  const imageExists = images.find(i => i === image);
  if (imageExists) return;
  images.push(image);
  fs.writeFileSync(MEDIA_FILE, JSON.stringify({ images }));
};

// Chat-bot functions
const getLetterCounts = (str: string): number[] => {
  // Count occunces of all letters in string, and add to array alphabetically sorted
  const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const messageLetters = str
    .toLowerCase()
    .split('')
    .filter(l => alphabet.includes(l));
  const messageLetterCount = messageLetters.reduce(
    (acc, cur) => {
      if (acc[cur]) acc[cur]++;
      else acc[cur] = 1;
      return acc;
    },
    {} as { [key: string]: number },
  );
  // Add missing characters
  for (const letter of alphabet) {
    if (!messageLetterCount[letter]) messageLetterCount[letter] = 0;
  }
  // Sort alphabetically
  const sortedLetters = Object.keys(messageLetterCount).sort();
  // Create array of letter counts
  const letterCounts = sortedLetters.map(l => messageLetterCount[l]);
  return letterCounts;
};
const arraysEqual = (a: number[], b: number[]): boolean => {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length !== b.length) return false;

  for (var i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};
const saveMessage = async (
  message: Message,
  previousMessage: Message,
): Promise<void> => {
  const replyText =
    !message.content && message.embeds.length > 0
      ? { embeds: [message.embeds[0]] }
      : message.content;
  console.log(
    `Saving message from ${message.author.username}: "${replyText}" in response to ${previousMessage.author.username}: "${previousMessage.content}"`,
  );
  if (
    typeof replyText === 'string' &&
    (replyText.length > 1000 || replyText.length < 1)
  )
    return;
  const messageText =
    message.type === 'REPLY'
      ? (await message.fetchReference()).content
      : previousMessage.content;

  const letterCounts = getLetterCounts(messageText);

  // Add to database
  const messages = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'))
    .messages as chatMessage[];
  const messageExists = messages.find(m =>
    arraysEqual(m.letters, letterCounts),
  );
  if (messageExists) return;
  messages.push({
    reply: replyText,
    letters: letterCounts,
  });
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify({ messages }));
};
const createChatResponse = async (
  message: Message,
): Promise<string | { embeds: MessageEmbed[] } | null> => {
  // Get letter counts
  const letterCounts = getLetterCounts(message.content);
  // Load messages
  const messages = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'))
    .messages as chatMessage[];
  // Calculate similarity
  const similarities = messages.map(m => {
    const similarity = m.letters.reduce(
      (acc, cur, i) => acc + Math.abs(cur - letterCounts[i]),
      0,
    );
    return similarity;
  });
  // Get most similar message
  const mostSimilar = Math.min(...similarities);
  const mostSimilarMessageList = messages.filter(
    m =>
      m.letters.reduce(
        (acc, cur, i) => acc + Math.abs(cur - letterCounts[i]),
        0,
      ) === mostSimilar,
  );
  const mostSimilarMessage =
    mostSimilarMessageList[
      Math.floor(Math.random() * mostSimilarMessageList.length)
    ];
  // Create response
  if (mostSimilarMessage) {
    const response = await createOutput(mostSimilarMessage.reply, message);
    console.log(`Sending generated message: ${response}`);
    return response;
  } else {
    return null;
  }
};

// Maps containing pending user actions. If a message comes in from a user in
// the map, the callback is called. If the callback returns false, the user's
// message goes through as normal. If the callback returns true, the message
// will be ignored by factbots systems.
type actionCallback = (
  pendingActions: Map<string, actionCallback>,
  message: Message,
) => boolean;
const pendingActions = new Map<string, actionCallback>();

let massDeleteIsRunning = false;

// Respond to funny messages
client.on('messageCreate', async message => {
  // Run action if available
  if (
    pendingActions.has(message.author.id) &&
    pendingActions.get(message.author.id)?.(pendingActions, message)
  ) {
    return;
  }

  if (!message.client.user) return;
  if (message.author.equals(message.client.user)) return;
  // Ignore anyone with "fact" in their name
  if (message.author.username.toLowerCase().includes('fact')) return;

  // Execute JavaScript code
  if (
    admins.includes(message!.author!.id) &&
    message.content.startsWith(',execute')
  ) {
    const sendMessage = (content: string, result: string) =>
      message.reply({
        content: '```js\n' + content + '\n```\n```\n' + result + '\n```',
      });
    const content = message.content.slice(',execute'.length);
    try {
      const result = (await eval(content)) as string;

      sendMessage(content, result).catch(() => {
        let stringed = JSON.stringify(result);
        if (!stringed) stringed = 'No output.';
        const buffer = Buffer.from(stringed, 'utf-8');
        const attachment = new MessageAttachment(buffer, 'result.txt');
        message.channel.send({
          content: 'Result:',
          files: [attachment],
        });
      });
    } catch (e) {
      sendMessage(content, `${e}`).catch(() => {
        let stringed = JSON.stringify(e);
        if (!stringed) stringed = 'No output.';
        const buffer = Buffer.from(stringed, 'utf-8');
        const attachment = new MessageAttachment(buffer, 'result.txt');
        message.channel.send({
          content: 'Error:',
          files: [attachment],
        });
      });
    }
    return;
  }

  // Remove first line if it contains "Reply to" or "Reply failed"
  const firstline = message.content.split('\n')[0];
  if (firstline.includes('Reply to') || firstline.includes('Reply failed')) {
    message.content = message.content.split('\n').slice(1).join('\n');
  }

  const isReply = message.type === 'REPLY';
  const newestMessages = await message.channel.messages.fetch({ limit: 2 });
  const repliedMessage = isReply
    ? await message.fetchReference()
    : undefined ?? newestMessages.map(m => m)[1];
  const previousMessageUser = isReply
    ? repliedMessage.author
    : newestMessages.map(m => m.author)[1];
  const previousMessage = isReply
    ? repliedMessage
    : newestMessages.map(m => m)[1];
  const mentionsSelf = message.mentions.has(message.client.user);

  // Chance to ignore if bot
  if (message.author.bot && !message.webhookId) {
    if (Math.random() < 0.7) return;
  }

  // Function to send messages
  async function sendMessage(sendFunction: () => Promise<any>) {
    try {
      await message.channel.sendTyping();
      setTimeout(async () => {
        try {
          await sendFunction();
        } catch (error) {
          console.log(error);
        }
      }, 2000);
    } catch (error) {
      console.log(error);
    }
  }

  // Mass delete own messages feature
  if (
    mentionsSelf &&
    message.content
      .toLowerCase()
      .includes('delete all my messages in this channel')
  ) {
    if (massDeleteIsRunning) {
      message.reply(`sorry buddy, please wait your turn <3`);
      return;
    }
    message.reply('are you sure?');

    pendingActions.set(message.author.id, (_actions, response) => {
      if (response.content !== 'yes') {
        response.reply('ok i wont');
        pendingActions.delete(message.author.id);
        return true;
      }

      response.reply('are you super duper sure?');
      pendingActions.set(message.author.id, (_actions, response) => {
        if (response.content !== 'yes i am sure') {
          response.reply('ok i wont');
          pendingActions.delete(message.author.id);
          return true;
        }

        response.reply('ok last chance to change your mind, are you sure?');
        pendingActions.set(message.author.id, (_actions, response) => {
          if (response.content !== 'do it') {
            response.reply('ok i wont');
            pendingActions.delete(message.author.id);
            return true;
          }

          response.reply('it will be done');
          massDeleteIsRunning = true;
          deleteAllMessagesInChannel(response).then(
            () => (massDeleteIsRunning = false),
          );
          pendingActions.delete(message.author.id);
          return true;
        });
        return true;
      });
      return true;
    });
    return;
  }

  // Send image if message mentions self and contains word "meme"
  if (mentionsSelf && message.content.toLowerCase().includes('meme')) {
    sendMessage(async () => {
      const images = JSON.parse(fs.readFileSync(MEDIA_FILE, 'utf8'))
        .images as string[];
      let randomImage = images[Math.floor(Math.random() * images.length)];

      // Check if random image is still valid
      async function checkImage(url: string) {
        const response = await fetch(url);
        return response.status === 200;
      }

      while (!(await checkImage(randomImage))) {
        images.splice(images.indexOf(randomImage), 1);
        fs.writeFileSync(MEDIA_FILE, JSON.stringify({ images }, null, 2));
        randomImage = images[Math.floor(Math.random() * images.length)];
      }

      await safeReply(message, randomImage);
    });
    return;
  }

  // -- CHATBOT --
  if (
    message.mentions.has(message.client.user) &&
    message.content
      .slice('<@961239124562567169>'.length, message.content.length)
      .trim().length > 0
  ) {
    const chatResponse = createChatResponse(message);
    sendMessage(async () => safeReply(message, await chatResponse));
    return;
  }
  if (
    !previousMessageUser.equals(message.author) &&
    Date.now() - previousMessage.createdTimestamp < 60 * 60 * 1000
  ) {
    // Dont save if from webhook
    if (!message.webhookId) {
      saveMessage(message, previousMessage);
    }
  }
  //* Removed because it was way too much
  // Reply with chatbot if previous message was me
  // and less than 7 seconds ago and 40% chance
  if (
    previousMessageUser.equals(message.client.user) &&
    Date.now() - previousMessage.createdTimestamp < 7000 &&
    message.type != 'REPLY' &&
    Math.random() < 0.3
  ) {
    const chatResponse = createChatResponse(message);
    sendMessage(async () => safeReply(message, await chatResponse));
    return;
  }
  //! Suggestion: Decrease time between replies for every message, increasing it over time
  //! This will make the bot reply to regular messages, but significantly reduce the amount of messages it sends.
  // Respond to replies //* replacement for above
  if (
    message.type === 'REPLY' &&
    previousMessage.author.equals(message.client.user)
  ) {
    const chatResponse = createChatResponse(message);
    sendMessage(async () => safeReply(message, await chatResponse));
    return;
  }

  // Respond to 0.5% of messages
  if (Math.random() < MESSAGE_RESPONSE_CHANCE) {
    const chatResponse = createChatResponse(message);
    sendMessage(async () => safeReply(message, await chatResponse));
    return;
  }

  // -- IMAGE COLLECTION --
  // If the message contains a link to an image or attachment
  if (message.attachments.size > 0 || message.embeds.length > 0) {
    if (!message.author.bot) {
      const file = message.attachments.first() || message.embeds[0];
      saveImagae(file);
    }

    // Respond with random downloaded image
    if (Math.random() < IMAGE_RESPONSE_CHANCE) {
      sendMessage(async () => {
        const images = JSON.parse(fs.readFileSync(MEDIA_FILE, 'utf8'))
          .images as string[];
        let randomImage = images[Math.floor(Math.random() * images.length)];

        // Check if random image is still valid
        async function checkImage(url: string) {
          const response = await fetch(url);
          return response.status === 200;
        }

        while (!(await checkImage(randomImage))) {
          images.splice(images.indexOf(randomImage), 1);
          fs.writeFileSync(MEDIA_FILE, JSON.stringify({ images }, null, 2));
          randomImage = images[Math.floor(Math.random() * images.length)];
        }

        await safeReply(message, randomImage);
      });
    }
  }

  // -- SPECIAL RESPONSES --

  // Respond to bots
  if (message.author.bot && Math.random() < BOT_RESPOND_CHANCE) {
    const chatResponse = createChatResponse(message);
    sendMessage(async () => safeReply(message, await chatResponse));
    return;
  }

  // Respond to mentions
  if (message.mentions.users.has(message.client.user.id)) {
    // Respond with chatbot message if previous message was me + less than 7 seconds ago
    if (message.type === 'REPLY') {
      const reference = await message.fetchReference();
      if (
        reference.author.equals(message.client.user) &&
        Date.now() - reference.createdTimestamp < 7000
      ) {
        const chatResponse = createChatResponse(message);
        sendMessage(async () => safeReply(message, await chatResponse));
        return;
      }
    } else if (
      previousMessage.author.equals(message.client.user) &&
      Date.now() - previousMessage.createdTimestamp < 7000
    ) {
      const chatResponse = createChatResponse(message);
      sendMessage(async () => safeReply(message, await chatResponse));
      return;
    }
    sendMessage(async () =>
      safeReply(
        message,
        await createOutput(
          general[Math.floor(Math.random() * general.length)],
          message,
        ),
      ),
    );
    return;
  }

  // insults
  if (previousMessageUser.equals(message.client.user)) {
    // check if message contains insults
    if (
      insults.some(insult => message.content.toLowerCase().includes(insult))
    ) {
      sendMessage(async () =>
        safeReply(
          message,
          await createOutput(
            insultReplies[Math.floor(Math.random() * insultReplies.length)],
            message,
          ),
        ),
      );
      return;
    }
  }
  // praise
  if (previousMessageUser.equals(message.client.user)) {
    // check if message contains praise
    if (praise.some(praise => message.content.toLowerCase().includes(praise))) {
      sendMessage(async () =>
        safeReply(
          message,
          await createOutput(
            praiseReplies[Math.floor(Math.random() * praiseReplies.length)],
            message,
          ),
        ),
      );
      return;
    }
  }

  // -- KEYWORDS --

  // cunny
  if (message.content.includes('cunny') && Math.random() > 0.5) {
    // choose random image
    const image = images[Math.floor(Math.random() * images.length)];
    const file = new MessageAttachment(
      path.resolve(path.join(IMAGES_DIR, image)),
    );
    sendMessage(() => safeReply(message, { files: [file] }));
    return;
  }
  // bug
  if (message.content.toLowerCase().includes('bug') && Math.random() < 0.2) {
    const bug = bugs[Math.floor(Math.random() * bugs.length)];
    const file = new MessageAttachment(path.resolve(path.join(BUG_DIR, bug)));
    sendMessage(() => safeReply(message, { files: [file] }));
    return;
  }
  // sex
  if (
    Math.random() < 0.1 &&
    hornyWords.some(w => message.content.includes(w))
  ) {
    const horny = images.filter(image => image.includes('horny'));
    const image = horny[Math.floor(Math.random() * horny.length)];
    const file = new MessageAttachment(
      path.resolve(path.join(IMAGES_DIR, image)),
    );
    sendMessage(() => safeReply(message, { files: [file] }));
    return;
  }
  // greetings
  if (
    greetings.some(w => message.content.startsWith(w) && Math.random() < 0.1)
  ) {
    sendMessage(async () =>
      safeReply(
        message,
        await createOutput(
          greetings[Math.floor(Math.random() * greetings.length)],
        ),
      ),
    );
    return;
  }
});

// Listen for reactions
client.on('messageReactionAdd', async (reaction, user) => {
  // Only continue if the reaction is on a message sent by the bot and the user is one of the admins
  // @ts-ignore
  if (admins.includes(user.id)) {
    // If the reaction is ❌, delete the message
    // @ts-ignore
    console.log(
      '❌ reaction detected, deleting message. Content: ' +
        reaction.message.content,
    );
    if (reaction!.emoji!.name === '❌') {
      await reaction!.message!.delete();
    }
  }
});

client.login(token);
