/*
* 点赞功能
* NAPCAT_HTTP_223和NAPCAT_HTTP_304是url常量在tools/constant.js
*/
import { paths, NAPCAT_HTTP_223, NAPCAT_HTTP_304,NAPCAT_HTTP_321, sleep, isMaster } from '../tools/index.js'
import NapCatAPI from '../tools/napcat-http.js'
import path from 'path'
import fs from 'fs';
import schedule from 'node-schedule';


/** 自动点赞续火列表
* @push 是否开启点赞消息推送
* @hitokoto 是否开启推送一言
*/


// 读取点赞对象
const thumbsUpMeData = path.join(paths.pluginDataPath, 'thumbsUpMe.json')
let thumbsUpMelist = {};
try {
    const raw = fs.readFileSync(thumbsUpMeData, 'utf-8');
    thumbsUpMelist = JSON.parse(raw);
} catch (err) {
    logger.error('读取或解析 thumbsUpMe.json 失败:', err);
}

/** 点赞次数，非会员10次，会员20次 */
const thumbsUpMe_sum = 10



export class Good extends plugin {
    constructor() {
        super({
            name: '[syuan-plugin]点赞',
            dsc: '可以定时点赞',
            event: 'message',
            priority: 500,
            rule: [
                {
                    reg: '#赞我',
                    fnc: 'thumbsUpMe'
                },
                {
                    reg: '#全赞',
                    fnc: 'thumbsUpAll'
                }
            ]
        })
    }

    async thumbsUpMe(e) {
        const say = time() + ",已给你点赞" + thumbsUpMe_sum + "次哦"

        function time() {
            const now = new Date();
            const hour = now.getHours(); // 0~23 的数字

            if (0 <= hour && hour <= 5) {
                return "碗尚豪小猫娘";
            } else if (6 <= hour && hour <= 8) {
                return "枣尚豪小猫娘";
            } else if (9 <= hour && hour <= 11) {
                return "尚唔豪小猫娘";
            } else if (12 <= hour && hour <= 14) {
                return "中唔豪小猫娘";
            } else if (15 <= hour && hour <= 17) {
                return "虾呜豪小猫娘";
            } else if (18 <= hour && hour <= 23) {
                return "碗尚豪小猫娘";
            }
        }

        await NapCatAPI.thumbsUp(which(e.self_id), e.user_id, thumbsUpMe_sum)
        e.reply(`用户` + e.user_id + `,` + say)
        return true
    }

    async thumbsUpAll(e) {
        if (!isMaster(e.self_id, e.user_id)) {
            e.reply('仅主人执行')
            return
        }
        const say = time() + ",已给你点赞" + thumbsUpMe_sum + "次哦"

        function time() {
            const now = new Date();
            const hour = now.getHours(); // 0~23 的数字

            if (0 <= hour && hour <= 5) {
                return "碗尚豪小猫娘";
            } else if (6 <= hour && hour <= 8) {
                return "枣尚豪小猫娘";
            } else if (9 <= hour && hour <= 11) {
                return "尚唔豪小猫娘";
            } else if (12 <= hour && hour <= 14) {
                return "中唔豪小猫娘";
            } else if (15 <= hour && hour <= 17) {
                return "虾呜豪小猫娘";
            } else if (18 <= hour && hour <= 23) {
                return "碗尚豪小猫娘";
            }
        }

        e.reply('[syuan-plugin] 开始自动点赞任务')
        for (let qq of Object.keys(thumbsUpMelist)) {
            await NapCatAPI.thumbsUp(NAPCAT_HTTP_223, qq, thumbsUpMe_sum)
            await sleep(2000)
            await NapCatAPI.thumbsUp(NAPCAT_HTTP_304, qq, thumbsUpMe_sum)
            await sleep(2000)
            await NapCatAPI.thumbsUp(NAPCAT_HTTP_321, qq, thumbsUpMe_sum)
            logger.mark(`[syuan-plugin][自动点赞] 已给QQ${qq}点赞${thumbsUpMe_sum}次`)
            if (thumbsUpMelist[qq].push) {
                NapCatAPI.sendPrivateMsg(NAPCAT_HTTP_223, qq, thumbsUpMelist[qq].group, say)
                await sleep(2000)
                //   NapCatAPI.sendPrivateMsg(NAPCAT_HTTP_304, qq, thumbsUpMelist[qq].group, say)
                //  await sleep(2000)
            }
            await sleep(8000) // 等8秒在下一个
        }
    }


}

/** 主动触发-点赞
 * 点赞开始时间
 * cron表达式定义推送时间 (秒 分 时 日 月 星期) 
 * 可使用此网站辅助生成：https://www.matools.com/cron/
 * 注意，每天都需要触发，因此日及以上选通配符或不指定
 * 只选小时就可以了
*/
schedule.scheduleJob('00 00 10 * * *', async () => {
    const say = time() + ",已给你点赞" + thumbsUpMe_sum + "次哦"

    function time() {
        const now = new Date();
        const hour = now.getHours(); // 0~23 的数字

        if (0 <= hour && hour <= 5) {
            return "碗尚豪小猫娘";
        } else if (6 <= hour && hour <= 8) {
            return "枣尚豪小猫娘";
        } else if (9 <= hour && hour <= 11) {
            return "尚唔豪小猫娘";
        } else if (12 <= hour && hour <= 14) {
            return "中唔豪小猫娘";
        } else if (15 <= hour && hour <= 17) {
            return "虾呜豪小猫娘";
        } else if (18 <= hour && hour <= 23) {
            return "碗尚豪小猫娘";
        }
    }

    for (let qq of Object.keys(thumbsUpMelist)) {
        await NapCatAPI.thumbsUp(NAPCAT_HTTP_223, qq, thumbsUpMe_sum)
        await sleep(2000)
        await NapCatAPI.thumbsUp(NAPCAT_HTTP_304, qq, thumbsUpMe_sum)
        await sleep(2000)
        await NapCatAPI.thumbsUp(NAPCAT_HTTP_321, qq, thumbsUpMe_sum)
        logger.mark(`[syuan-plugin][自动点赞] 已给QQ${qq}点赞${thumbsUpMe_sum}次`)
        if (thumbsUpMelist[qq].push) {
            NapCatAPI.sendPrivateMsg(NAPCAT_HTTP_223, qq, thumbsUpMelist[qq].group, say)
            await sleep(2000)
            //  NapCatAPI.sendPrivateMsg(NAPCAT_HTTP_304, qq, thumbsUpMelist[qq].group, say)
            await sleep(2000)
        }
        await sleep(8000) // 等8秒在下一个
    }
})

function which(uid) {
    if (String(uid) === "2239841632") {
        return NAPCAT_HTTP_223
    }
    else if(String(uid) === "3210532108"){
        return NAPCAT_HTTP_321
    }
    else {
        return NAPCAT_HTTP_304
    }
}