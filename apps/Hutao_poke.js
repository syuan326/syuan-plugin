import { isMaster, NapCatAPI, paths } from '../tools/index.js'
import common from '../../../lib/common/common.js'
import moment from "moment";
import cfg from '../../../lib/config/config.js'
import fetch from 'node-fetch'
import fs from 'fs/promises'
import path from 'path';
import YAML from 'yaml'



let api = {}

try {
    const a = await fs.readFile(path.join(paths.rootResourcesPath, 'secret.yaml'), 'utf8');
    api = YAML.parse(a);
} catch (err) {
    logger.error('读取文件失败:', err);
}

const API_KEY = api.yuan_api_key
const API_URL = api.yuan_api_url

// 支持信息详见文件最下方
//在这里设置事件概率,请保证概率加起来小于1，少于1的部分会触发反击
let reply_text = 0.6 //文字回复概率
let reply_img = 0.4 //图片回复概率
let reply_voice = 0 //语音回复概率
let mutepick = 0 //禁言概率
let example = 0.3 //拍一拍表情概率

// AI是独立的
let ai_reply = 0.4 //ai替换回复概率

let mutetime = 0 //禁言时间设置，单位分钟，如果设置0则为自动递增，如需关闭禁言请修改触发概率为0
const botIds = [2239841632, 3210532108]

let data = {}
const dataurl = path.join(paths.pluginDataPath,  'hutaopoke.yaml')
try {
    const f = await fs.readFile(dataurl, 'utf8');
    data = YAML.parse(f);
} catch (err) {
    logger.error('读取文件失败:', err);
}
let word_list = data.word_list //文字回复列表
let bot_haqi_to_master = data.bot_haqi_to_master //别人戳主人文字列表
let bot_haqi_to_others = data.bot_haqi_to_others //主人戳别人文字列表
let fight_back = data.fight_back //反击文字列表

let ciku_ = data.ciku_ //戳次数

const mood = [
    '开心的(>ω<)',
    '难过的(〒︿〒)',
    '生气的(╬￣皿￣)=○#(￣～￣;)',
    '无聊的(￣︶￣)',
    '困惑的(⊙_⊙;)',
    '兴奋的(≧∇≦)/',
    '平静的(￣ー￣)',
]

const napcatUrl = "http://127.0.0.1:13002"
const url = path.join(paths.pluginResourcesPath, 'hutao_poke')
const pokeUrl = path.join(url, 'poke')
const angryUrl = path.join(url, 'angry')
const arronganceUrl = path.join(url, 'arrogance')
const voiceUrl = path.join(url, 'voice')
const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff']
const voiceExtensions = ['.mp3', '.wav', '.aac', '.flac', '.ogg', '.m4a']

export class chuo extends plugin {
    constructor() {
        super({
            name: '戳一戳',
            dsc: '戳一戳机器人触发效果',
            event: 'notice.group.poke',
            priority: 100,
            rule: [
                {
                    /** 命令正则匹配 */
                    fnc: 'chuoyichuo'
                }
            ]
        }
        )
    }

    async chuoyichuo(e) {
        /* operator_id是主动戳人的id
        * self_id是机器人id
        * target_id是被戳的id
        */
        //忽略机器人戳
        if (botIds.includes(e.operator_id)) return;



        // 戳别人哈气
        if (isMaster(e.self_id, e.operator_id) && e.self_id != e.target_id) {
            let angryPath = await getPoke(angryUrl, imageExtensions)
            let text_number = Math.ceil(Math.random() * bot_haqi_to_master['length'])
            if (angryPath instanceof Error) {
                e.reply('图片获取失败，请检查目录路径或文件权限。');
            } else if (angryPath === null) {
                e.reply('没有找到图片文件。');
            } else {
                try {
                    e.reply([
                        segment.at(e.operator_id),
                        `\n${bot_haqi_to_master[text_number - 1]}`,
                        await IMAGE(angryPath, { isface: true }),// 使用本地图片路径
                    ], true);

                    // 等待 1 秒
                    common.sleep(1000);

                    // 戳一戳成员

                    NapCatAPI.sendPoke(napcatUrl, e.group_id, e.operator_id)
                    return true;
                } catch (err) {
                    e.reply('图片发送失败，请检查文件或联系开发者。');
                }
            }

        }


        if (isMaster(e.self_id, e.target_id)) {
            logger.info('[戳主人生效]')
            if (isMaster(e.self_id, e.operator_id) || e.self_id == e.operator_id) {
                return;
            }
            let text_number = Math.ceil(Math.random() * bot_haqi_to_others['length'])

            let angryPath = await getPoke(angryUrl, imageExtensions)
            if (angryPath instanceof Error) {
                e.reply('图片获取失败，请检查目录路径或文件权限。');
            } else if (angryPath === null) {
                e.reply('没有找到图片文件。');
            } else {
                try {
                    e.reply([
                        segment.at(e.operator_id),
                        `\n${bot_haqi_to_others[text_number - 1]}`,
                        await IMAGE(angryPath, { isface: true })// 使用本地图片路径

                    ], true);

                    // 等待 1 秒
                    common.sleep(1000);

                    // 戳一戳成员
                    if (botIds.includes(e.operator_id)) return;
                    NapCatAPI.sendPoke(napcatUrl, e.group_id, e.operator_id)

                    return true;
                } catch (err) {
                    e.reply('图片发送失败，请检查文件或联系开发者。');
                }
            }
        }



        if (e.target_id == e.self_id) {
            logger.info('[戳机器人生效]')
            let count = await redis.get(`Yz:pokecount:`);
            let group = Bot.pickGroup(e.group_id);
            let usercount = mutetime - 1
            if (mutetime == 0) {
                usercount = await redis.get('Yz:pokecount' + e.operator_id + ':')
            }

            // 当前时间
            let time = moment(Date.now())
                .add(1, "days")
                .format("YYYY-MM-DD 00:00:00");
            // 到明日零点的剩余秒数
            let exTime = Math.round(
                (new Date(time).getTime() - new Date().getTime()) / 1000
            );
            if (!count) {
                await redis.set(`Yz:pokecount:`, 1 * 1, { EX: exTime });//${e.group_id}
            } else {
                await redis.set(`Yz:pokecount:`, ++count, {
                    EX: exTime,
                });
            }
            if (mutetime == 0) {
                if (!usercount) {
                    await redis.set('Yz:pokecount' + e.operator_id + ':', 1 * 1, { EX: exTime });
                } else {
                    await redis.set('Yz:pokecount' + e.operator_id + ':', ++usercount, { EX: exTime, });
                }
            }
            if (Math.ceil(Math.random() * 100) <= 20 && count >= 10) {
                let conf = cfg.getGroup(e.group_id);
                e.reply([
                    `${ciku_[Math.round(Math.random() * (ciku_.length - 1))]}`
                        .replace("_name_", conf.botAlias[0])
                        .replace("_num_", count),
                ]);
                return true;
            }
            //生成0-100的随机数
            let random_type = Math.random()
            // let random_type = 0.80

            //回复随机文字
            if (random_type < reply_text) {
                let ai_num = Math.random()
                if (ai_num > ai_reply) {
                    logger.info('[AI随机文字回复生效]')
                    let text_number = Math.ceil(Math.random() * mood['length'])
                    const response = await fetch(API_URL, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${API_KEY}`
                        },
                        body: JSON.stringify({
                            model: "deepseek-v3",
                            messages: [
                                { role: "system", content: `你是一只名叫胡桃的小猫咪，你现在的心情是${mood[text_number - 1]}，请根据这个心情来回复用户。每句话结尾都要加一个喵字。` },
                                {
                                    role: "user",
                                    content: `用户名:${e.sender.nickname}，userid:${e.user_id} 戳了一下你，你要根据你的心情并且使用不超过8个字来回复他喵，这是部分回复内容：${word_list.join('，')}。`
                                }
                            ]
                        })
                    });
                    const data1 = await response.json();
                    e.reply(data1.choices[0].message.content)
                } else {
                    logger.info('[回复随机文字生效]')
                    let text_number = Math.ceil(Math.random() * word_list['length'])
                    e.reply(word_list[text_number - 1])
                }
            }


            //回复随机图片
            else if (random_type < (reply_text + reply_img)) {
                logger.info('[回复随机图片生效]')

                let imagePath = await getPoke(pokeUrl, imageExtensions)
                if (imagePath instanceof Error) {
                    e.reply('图片获取失败，请检查目录路径或文件权限。');
                } else if (imagePath === null) {
                    e.reply('没有找到图片文件。');
                } else {
                    try {
                        e.reply(
                            await IMAGE(imagePath, { isface: true }) // 使用本地图片路径
                        );

                        return true;
                    } catch (err) {
                        e.reply('图片发送失败，请检查文件或联系开发者。');
                    }
                }
            }

            //回复随机语音
            else if (random_type < (reply_text + reply_img + reply_voice)) {
                logger.info('[回复随机语音生效]')
                let voicePath = await getPoke(voiceUrl, voiceExtensions)
                if (voicePath instanceof Error) {
                    e.reply('语音获取失败，请检查目录路径或文件权限。');
                } else if (voicePath === null) {
                    e.reply('没有找到语音文件。');
                } else {
                    try {
                        e.reply([
                            segment.record(voicePath),
                        ]);

                        return true;
                    } catch (err) {
                        e.reply('语音发送失败，请检查文件或联系开发者。');
                    }
                }

            }

            //禁言
            else if (random_type < (reply_text + reply_img + reply_voice + mutepick)) {
                if (isMaster(e.self_id, e.target_id) || !group.is_admin) {

                    let arrongancePath = await getPoke(arronganceUrl, imageExtensions)
                    if (arrongancePath instanceof Error) {
                        e.reply('图片获取失败，请检查目录路径或文件权限。');
                    } else if (arrongancePath === null) {
                        e.reply('没有找到图片文件。');
                    } else {
                        try {
                            e.reply(
                                await IMAGE(arrongancePath, { isface: true }) // 使用本地图片路径
                            );

                            return true;
                        } catch (err) {
                            e.reply('图片发送失败，请检查文件或联系开发者。');
                        }
                    }
                }
                logger.info('[禁言生效]')
                logger.info(e.operator_id + `将要被禁言${usercount + 1}分钟`)
                if (usercount >= 36) {
                    e.reply('给你一脚喵')
                    await common.sleep(1000)
                    await e.group.muteMember(e.operator_id, 21600)
                    return
                }
                //n种禁言方式，随机选一种
                let mutetype = Math.ceil(Math.random() * 4)
                if (mutetype == 1) {
                    e.reply('大胆喵，谁让你戳的喵')
                    await common.sleep(1000)
                    await e.group.muteMember(e.operator_id, 60 * (usercount + 1))
                }
                if (mutetype == 2) {
                    e.reply('你好喵')
                    await common.sleep(1000);
                    e.reply('可爱的喵')
                    await common.sleep(1000);
                    e.reply('为什么不回信息喵')
                    await common.sleep(1000);
                    e.reply('拉黑喵')
                    return
                }
                if (mutetype == 3) {
                    e.reply('猫山王镇压喵')
                    await common.sleep(1000)
                    if (botIds.includes(e.operator_id)) return;
                    NapCatAPI.sendPoke(napcatUrl, e.group_id, e.operator_id)
                    await e.group.muteMember(e.operator_id, 60 * (usercount + 1))
                    await common.sleep(1000);
                    return
                }
                if (mutetype == 4) {
                    e.reply('布吉岛喵')
                    await common.sleep(1000)
                    if (botIds.includes(e.operator_id)) return;
                    NapCatAPI.sendPoke(napcatUrl, e.group_id, e.operator_id)
                    await e.group.muteMember(e.operator_id, 60 * (usercount + 1))
                    return
                }
            }

            //拍一拍表情包
            else if (random_type < (reply_text + reply_img + reply_voice + mutepick + example)) {
                logger.info('[回复拍一拍表情包生效]')

                let image = await getUserPoke(e.operator_id)
                if (image === null) return true

                if (image instanceof Error) {
                    e.reply('图片获取失败，请检查目录路径或文件权限。');
                } else if (image === null) {
                    e.reply('没有找到图片文件。');
                } else {
                    try {
                        e.reply(
                            await IMAGE(image, { isface: true }) // 使用本地图片路径
                        );

                        return true;
                    } catch (err) {
                        e.reply('图片发送失败，请检查文件或联系开发者。');
                    }
                }


            }

            //反击
            else {

                let text_number = Math.ceil(Math.random() * bot_haqi_to_others['length'])
                e.reply(fight_back[text_number - 1])
                await common.sleep(1000)
                if (botIds.includes(e.operator_id)) return;
                NapCatAPI.sendPoke(napcatUrl, e.group_id, e.operator_id)
            }
        }
    }

}



async function getPoke(isUrl, extension) {
    try {
        const files = await fs.readdir(isUrl); // 异步读取目录
        const filter = files.filter(file =>
            extension.some(ext => path.extname(file).toLowerCase() === ext.toLowerCase())
        );

        if (filter.length === 0) return null;

        const random = filter[Math.floor(Math.random() * filter.length)];
        return path.join(isUrl, random);
    } catch (error) {
        logger.error(`getPoke报错：${error}`);
        return error;
    }
}

async function getUserPoke(existUser) {
    const thisUrl = path.join(pokeUrl, String(existUser))
    try {
        fs.access(thisUrl)
        let here = await getPoke(thisUrl, imageExtensions)
        return here
    } catch (error) {
        let other = await getPoke(pokeUrl, imageExtensions)
        logge.error(`报错了：${error}`)
        return other
    }
}


async function IMAGE(file, options = {}) {
    const imgSeg = segment.image(file)
    imgSeg.sub_type = options.isface ? 1 : 0
    return imgSeg
}