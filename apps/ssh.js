import { Client } from 'ssh2'
import { sshData, isMaster } from '../tools/index.js'

export class UpdateMemeRepos extends plugin {
    constructor() {
        super({
            name: '[syuan-plugin]更新表情包',
            dsc: '通过SSH密码连接远程服务器更新所有meme仓库并重启 systemd 服务',
            event: 'message',
            priority: 50,
            rule: [{
                reg: '^#?memenew$',
                fnc: 'updateRepos'
            }]
        })
    }

    async updateRepos(e) {
        if (!isMaster(e.self_id, e.user_id)) {
            e.reply('[syuan-plugin]表情服务更新：仅主人可用')
            return
        }
        e.reply('正在连接远程服务器，请稍等...')

        const config = sshData.loadSshConfig()
        const validation = sshData.validateSshConfig(config)
        if (!validation.isValid) {
            e.reply(`❌ ${validation.message}`)
            return false
        }

        const { host, port, username, password } = config
        const conn = new Client()

        return new Promise((resolve, reject) => {
            conn.on('ready', () => {
                e.reply('✅ SSH连接成功，正在更新仓库...')

                // 更新仓库 + 重启 systemd 服务（只输出仓库名）
                const cmd = `
cd /root/meme_img &&
for d in */; do
  cd "$d" &&
  if [ -d ".git" ]; then
    git fetch --all >/dev/null 2>&1 &&
    git reset --hard origin/$(git rev-parse --abbrev-ref HEAD) >/dev/null 2>&1 &&
    echo "✅ 已更新仓库: $d"
  else
    echo "跳过非Git目录: $d"
  fi
  cd ..
done &&

echo "✅ 仓库更新完成" &&
systemctl restart meme-service.service &&
echo "✅ Systemd 服务已重启"
`
                conn.exec(cmd, { pty: true }, (err, stream) => {
                    if (err) {
                        e.reply(`❌ 命令执行失败：${err.message}`)
                        conn.end()
                        return reject(err)
                    }

                    let output = ''
                    stream.on('close', (code, signal) => {
                        conn.end()
                        e.reply(output)
                        resolve(true)
                    }).on('data', (data) => {
                        output += data.toString()
                    }).stderr.on('data', (data) => {
                        output += data.toString()
                    })
                })
            }).connect({
                host,
                port: port || 22,
                username,
                password
            })

            conn.on('error', err => {
                e.reply(`❌ SSH连接失败：${err.message}`)
                reject(err)
            })
        })
    }
}
