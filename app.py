"""
Flask Web 版美食聊天机器人（Redis 后端 Session，彻底解决 4 KB Cookie 问题）
运行：python app.py
访问：http://localhost:5000
"""
# =====================  新增：Redis 后端  =====================
from flask_session import Session      # pip install Flask-Session
import redis                            # pip install redis
# ============================================================

from flask import Flask, render_template, request, jsonify, session, send_from_directory
from datetime import timedelta, datetime
import os
import uuid
from dotenv import load_dotenv
from food_bot import SimpleFoodBot
import traceback

# 加载 .env
load_dotenv()

app = Flask(__name__, static_folder='static', template_folder='templates')

# ================  Redis Session 配置（替换原 Cookie 配置）  ================
app.config['SECRET_KEY'] = 'food_bot_secret_key_2024'
app.config['SESSION_TYPE'] = 'redis'
app.config['SESSION_PERMANENT'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=24)
app.config['SESSION_USE_SIGNER'] = True
app.config['SESSION_KEY_PREFIX'] = 'food_bot:'
# 本地默认端口 6379，无密码；生产改成 redis://:pwd@host:6379/1
app.config['SESSION_REDIS'] = redis.from_url('redis://localhost:6379/0')
Session(app)                          # 初始化扩展
# ============================================================================

API_KEY = os.getenv('BAIDU_API_KEY', '')
if not API_KEY or not API_KEY.startswith('bce-'):
    print("⚠️  未找到有效 API Key，请在 .env 文件写入 BAIDU_API_KEY=your_bce_key")

# 机器人单例
bot_instance = None
def get_bot():
    global bot_instance
    if bot_instance is None and API_KEY:
        try:
            bot_instance = SimpleFoodBot(API_KEY)
            print("✓ 机器人初始化成功")
        except Exception as e:
            print(f"✗ 机器人初始化失败: {e}")
            bot_instance = None
    return bot_instance

# ---------- 以下为原业务代码，未做任何改动 ----------
@app.before_request
def before_request():
    if 'conversations' not in session:
        session['conversations'] = {}
    if 'current_conversation_id' not in session:
        default_id = str(uuid.uuid4())
        session['current_conversation_id'] = default_id
        session['conversations'][default_id] = {
            'name': '新对话',
            'history': [],
            'starred': False,
            'created_at': datetime.now().isoformat(),
            'last_updated': datetime.now().isoformat(),
            'last_message': '您好！欢迎使用食探AI'
        }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    try:
        current_id = session.get('current_conversation_id')
        if not current_id:
            return jsonify({'success': False, 'reply': '请先创建对话'})

        data = request.json
        user_input = data.get('message', '').strip()
        if not user_input:
            return jsonify({'success': False, 'reply': '请输入内容'})

        # 特殊指令
        if user_input.lower() in ['清空', '清除', 'clear', 'reset']:
            if current_id in session['conversations']:
                session['conversations'][current_id]['history'] = []
                session['conversations'][current_id]['last_message'] = '对话已清空'
                session['conversations'][current_id]['last_updated'] = datetime.now().isoformat()
                session.modified = True
            return jsonify({'success': True, 'reply': '当前对话历史已清空！'})

        if user_input.lower() in ['帮助', 'help', '?']:
            return jsonify({'success': True, 'reply': get_help_message()})

        bot = get_bot()
        if not bot:
            return jsonify({'success': False, 'reply': '机器人服务暂不可用'})

        conversation = session['conversations'][current_id]
        history = conversation['history']
        # 最多 4 轮
        if len(history) > 8:
            history = history[-8:]

        reply = bot.ask(user_input, conversation_history=history)

        user_msg = {'role': 'user', 'content': user_input, 'timestamp': get_current_time()}
        ai_msg = {'role': 'assistant', 'content': reply, 'timestamp': get_current_time()}
        history.extend([user_msg, ai_msg])
        if len(history) > 8:
            history = history[-8:]
        conversation['history'] = history
        conversation['last_message'] = user_input[:30] + ('...' if len(user_input) > 30 else '')
        conversation['last_updated'] = datetime.now().isoformat()
        if len(history) == 2:  # 第一条
            conversation['name'] = user_input[:20] + ('...' if len(user_input) > 20 else '')
        session['conversations'][current_id] = conversation
        session.modified = True
        return jsonify({'success': True, 'reply': reply, 'conversation_id': current_id})

    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'reply': f'内部错误：{type(e).__name__}'})

# ---------------- 其余路由原封不动 ----------------
@app.route('/conversations', methods=['GET'])
def get_conversations():
    try:
        conversations = session.get('conversations', {})
        current_id = session.get('current_conversation_id', '')
        lst = []
        for cid, c in conversations.items():
            lst.append({
                'id': cid, 'name': c.get('name', '未命名'),
                'last_message': c.get('last_message', ''), 'starred': c.get('starred', False),
                'created_at': c.get('created_at'), 'last_updated': c.get('last_updated'),
                'message_count': len(c.get('history', [])) // 2, 'is_current': cid == current_id
            })
        lst.sort(key=lambda x: (not x['starred'], x['last_updated']), reverse=True)
        return jsonify({'success': True, 'conversations': lst, 'current_conversation_id': current_id})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

@app.route('/conversations/new', methods=['POST'])
def new_conversation():
    data = request.json or {}
    name = data.get('name', '新对话')
    new_id = str(uuid.uuid4())
    session['conversations'][new_id] = {
        'name': name, 'history': [], 'starred': False,
        'created_at': datetime.now().isoformat(), 'last_updated': datetime.now().isoformat(),
        'last_message': '新对话开始'
    }
    session['current_conversation_id'] = new_id
    session.modified = True
    return jsonify({'success': True, 'conversation_id': new_id, 'message': '新对话创建成功'})

@app.route('/conversations/switch', methods=['POST'])
def switch_conversation():
    data = request.json or {}
    cid = data.get('conversation_id')
    if not cid:
        return jsonify({'success': False, 'message': '缺少对话ID'})
    if cid not in session['conversations']:
        session['conversations'][cid] = {
            'name': '新对话', 'history': [], 'starred': False,
            'created_at': datetime.now().isoformat(), 'last_updated': datetime.now().isoformat(),
            'last_message': '新对话开始'
        }
    session['current_conversation_id'] = cid
    session.modified = True
    c = session['conversations'][cid]
    return jsonify({'success': True, 'conversation_id': cid, 'history': c.get('history', []),
                    'conversation_name': c.get('name', '未命名')})

@app.route('/conversations/delete', methods=['POST'])
def delete_conversation():
    data = request.json or {}
    cid = data.get('conversation_id')
    conversations = session.get('conversations', {})
    if cid not in conversations:
        return jsonify({'success': False, 'message': '对话不存在'})
    if session.get('current_conversation_id') == cid:
        others = [k for k in conversations.keys() if k != cid]
        if others:
            session['current_conversation_id'] = others[0]
        else:
            new_id = str(uuid.uuid4())
            session['current_conversation_id'] = new_id
            session['conversations'][new_id] = {
                'name': '新对话', 'history': [], 'starred': False,
                'created_at': datetime.now().isoformat(), 'last_updated': datetime.now().isoformat(),
                'last_message': '新对话开始'
            }
    conversations.pop(cid, None)
    session.modified = True
    return jsonify({'success': True, 'message': '对话已删除',
                    'current_conversation_id': session.get('current_conversation_id', '')})

@app.route('/conversations/star', methods=['POST'])
def star_conversation():
    data = request.json or {}
    cid = data.get('conversation_id')
    conversations = session.get('conversations', {})
    if cid not in conversations:
        return jsonify({'success': False, 'message': '对话不存在'})
    conv = conversations[cid]
    starred = not conv.get('starred', False)
    conv['starred'] = starred
    conv['last_updated'] = datetime.now().isoformat()
    session.modified = True
    return jsonify({'success': True, 'starred': starred,
                    'message': '已标记' if starred else '已取消标记'})

@app.route('/clear', methods=['POST'])
def clear_current_history():
    cid = session.get('current_conversation_id')
    if cid and cid in session.get('conversations', {}):
        session['conversations'][cid]['history'] = []
        session['conversations'][cid]['last_message'] = '对话已清空'
        session['conversations'][cid]['last_updated'] = datetime.now().isoformat()
        session.modified = True
        return jsonify({'success': True, 'message': '历史记录已清空'})
    return jsonify({'success': False, 'message': '没有可清空的对话'})

@app.route('/status', methods=['GET'])
def get_status():
    bot = get_bot()
    conversations = session.get('conversations', {})
    return jsonify({'success': True, 'status': 'active' if bot else 'inactive',
                    'conversation_count': len(conversations),
                    'current_conversation_id': session.get('current_conversation_id', '')})

@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory(app.static_folder, filename)

# 辅助函数
def get_current_time():
    return datetime.now().strftime('%H:%M')

def get_help_message():
    return """🤖 食探机器人命令：
输入“帮助”显示此信息；
输入“清空”清当前对话；
其余任意美食问题直接问即可！"""

# ---------- 可选：一键清 Session 路由 ----------
@app.route('/clear_all')
def clear_all_session():
    session.clear()
    # 重建默认对话
    default_id = str(uuid.uuid4())
    session['conversations'] = {}
    session['current_conversation_id'] = default_id
    session['conversations'][default_id] = {
        'name': '新对话', 'history': [], 'starred': False,
        'created_at': datetime.now().isoformat(), 'last_updated': datetime.now().isoformat(),
        'last_message': '您好！欢迎使用食探AI'
    }
    session.modified = True
    return """
    <html><head><title>Session 已清理</title></head><body>
    <h1>✅ Session 已成功清理！</h1>
    <p><a href="/">返回首页</a></p>
    <script>document.cookie = "session=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/";</script>
    </body></html>
    """

# ===================== 启动 =====================
if __name__ == '__main__':
    for d in ['static', 'static/css', 'static/js', 'static/videos', 'templates', 'uploads']:
        os.makedirs(d, exist_ok=True)
    if API_KEY and API_KEY.startswith('bce-'):
        get_bot()
        print("✓ 服务器准备就绪")
    else:
        print("⚠️  未配置有效 API Key，部分功能受限")
    print("🌐 服务器启动中... \n👉 请访问：http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)