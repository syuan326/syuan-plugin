import { paths } from '#paths';
export class newcomer extends plugin {
    constructor() {
        super({
            name: '欢迎新人',
            dsc: '新人入群欢迎',
            /** https://oicqjs.github.io/oicq/#events */
            event: 'notice.group.increase',
            priority: 100
        })
    }

    /** 接受到消息都会执行一次 */
    async accept() {

        /** 冷却cd 0s */
        let cd = 1
        let output;
        const Default = '欢迎新人呀'
        if (this.e.user_id == this.e.bot.uin) return

        /** cd */
        let key = `Yz:newcomers:${this.e.group_id}`
        if (await redis.get(key)) return
        redis.set(key, '1', { EX: cd })

        /** 回复 */
        // 读取欢迎词
        let welcomeMsg = Default;
        try {
            const fs = await import('fs');
            const path = await import('path');
            const filePath = path.join(paths.rootDataPath, 'welcome.json');
            if (fs.existsSync(filePath)) {
                const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                if (data && data[this.e.group_id]) {
                    welcomeMsg = data[this.e.group_id];
                }
            }
        } catch (err) {
            logger.error('读取欢迎词失败：', err);
        }

        await this.reply([
            segment.at(this.e.user_id),
            welcomeMsg,
            segment.image('https://gitee.com/Elvin-Apocalys/pic-bed/raw/master/other1/welcome1.webp'),
        ])
    }
}
