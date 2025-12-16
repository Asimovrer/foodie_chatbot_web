# foodie_chatbot_web
利用百度千帆模型API实现自己的全国美食推荐助手
！！请用一下项目结构存放对应文件！！！
foodie_chatbot_web/
│
├── app.py                    # Flask主应用文件（已更新支持多对话管理）
├── food_bot.py               # 机器人核心代码（保持不变）
├── requirements.txt          # Python依赖包
├── .env                      # 环境变量文件（需要您添加API密钥）
│
├── templates/               # Flask模板文件夹
│   └── index.html          # 主页面HTML（已更新）
│
├── static/                  # 静态资源文件夹
│   ├── css/
│   │   └── style.css       # 样式文件（已更新）
│   ├── js/
│   │   └── script.js       # 前端交互脚本（已更新）
│   └── videos/             # 视频文件夹
│       └── surprise.mp4    # 惊喜彩蛋视频（您需要提供）
