import NapCatAPI from "../tools/napcat-http.js"
import { NAPCAT_HTTP_223, NAPCAT_HTTP_304 } from "../tools/index.js"

function which(uid) {
    if (String(uid) === "2239841632") {
        return NAPCAT_HTTP_223
    } else {
        return NAPCAT_HTTP_304
    }
}

export class run extends plugin {
    constructor() {
        super({
            name: '退群通知',
            dsc: 'xx退群了',
            event: 'notice.group.decrease'
        })

        /** 退群提示词 */
        this.tips = '跑路了喵'
    }

    async accept(e) {
        if (this.e.user_id == this.e.bot.uin) return

        let name, msg
        if (this.e.member) {
            name = this.e.member.card || this.e.member.nickname
        }

        if (name) {
            msg = `${name}(${this.e.user_id}) ${this.tips}`
        } else {
            msg = `${this.e.user_id} ${this.tips}`
        }
        logger.mark(`[退出通知]${this.e.logText} ${msg}`)
        await NapCatAPI.sendGroupMsg(which(e.self_id), e.group_id, msg)
        await NapCatAPI.sendRun(which(e.self_id), e.group_id)


    }
}
