import plugin from '../../lib/plugins/plugin.js'

export class TailHook extends plugin {
  constructor () {
    super({
      name: 'Yunzai消息尾巴Hook',
      dsc: '拦截所有 e.reply / bot.sendMsg 自动加尾巴',
      event: 'bot.connect',
      priority: 999999,
      rule: []
    })
  }

  async botConnect () {
    const Bot = global.Bot
    if (!Bot) {
      logger.info('[TailHook] Bot 未初始化，跳过')
      return
    }

    if (Bot._tailPatched) {
      logger.info('[TailHook] 已经 Hook 过了，跳过')
      return
    }
    Bot._tailPatched = true

    // 多账号情况
    const bots = Bot.uin ? [Bot] : Object.values(Bot)

    for (const bot of bots) {
      if (!bot.sendMsg) {
        logger.info('[TailHook] bot.sendMsg 不存在，跳过该账号')
        continue
      }

      const _sendMsg = bot.sendMsg.bind(bot)

      bot.sendMsg = async function (data) {
        try {
          if (typeof data.msg === 'string') {
            data.msg += '\n—— 来自你的 Bot'
          }

          if (Array.isArray(data.msg)) {
            data.msg.push({
              type: 'text',
              text: '\n—— 来自你的 Bot'
            })
          }
        } catch (err) {
          logger.info('[TailHook] 尾巴处理异常：', err)
        }

        return await _sendMsg(data)
      }

      logger.info(`[TailHook] 已 Hook bot(${bot.uin}) 发送消息`)
    }
  }
}
