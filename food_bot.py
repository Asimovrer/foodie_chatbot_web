"""
修改后的美食机器人核心代码 - 适配Web版本 (增强网络稳定性 & 支持历史记忆 & 格式化回复)
"""
import requests
import json


class SimpleFoodBot:
    def __init__(self, api_key: str):
        """
        初始化机器人
        :param api_key: 百度千帆的API Key
        """
        self.api_key = api_key
        
        # 测试API连接
        if self._test_connection():
            print("✓ API连接成功！机器人初始化完成。")
        else:
            print("✗ API连接失败，请检查API Key和网络。")
            raise ConnectionError("API连接失败")

    def _test_connection(self) -> bool:
        """测试API连接是否正常"""
        try:
            # 测试时也强制不使用代理，保持环境一致
            proxies = {"http": None, "https": None}
            response = requests.post(
                "https://qianfan.baidubce.com/v2/chat/completions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.api_key}"
                },
                json={
                    "model": "ernie-3.5-8k",
                    "messages": [{"role": "user", "content": "你好"}],
                    "max_tokens": 50
                },
                timeout=10,
                proxies=proxies  # 新增
            )
            return response.status_code == 200
        except Exception as e:
            print(f"[测试连接异常] {e}")
            return False

    def ask(self, user_input: str, conversation_history=None) -> str:
        """主对话方法 - Web版专用 (增强稳定性版 & 支持历史记忆 & 格式化回复)
        :param user_input: 用户当前输入
        :param conversation_history: 格式为 [{'role':'user','content':'...'}, {'role':'assistant','content':'...'}, ...] 的列表
        """
        if not user_input.strip():
            return "请输入您想了解的美食问题哦~"
        
        # 准备请求数据
        url = "https://qianfan.baidubce.com/v2/chat/completions"
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        
        # 构建系统提示词（增强版：要求格式化的回复）
        system_prompt = """你是"食探"，一个专业的美食推荐专家。你精通中国各地菜系、餐厅推荐、美食文化和饮食搭配。

请遵循以下原则：
1. 专注于美食相关内容
2. 提供实用的餐厅或菜品推荐
3. 考虑用户的预算、口味偏好和地点
4. 回答要热情、专业、实用，并且格式化输出
5. 如果用户询问非美食内容，礼貌地引导回美食话题

格式化要求：
- 使用清晰的段落分隔
- 使用项目符号（•）或编号列表
- 适当使用空行分隔不同部分
- 突出重要信息如价格、地点、特色
- 对餐厅推荐使用"**"加粗突出

请开始你的美食推荐："""
        
        # ============ 关键：构建包含历史的消息列表 ============
        messages = [{"role": "system", "content": system_prompt}]
        
        # 1. 如果有历史对话，先添加历史（注意格式转换）
        if conversation_history:
            # 只取最近的8轮历史（16条消息），避免超出token限制
            for msg in conversation_history[-16:]:
                # 确保历史消息的格式符合API要求，只保留 role 和 content
                # 注意：历史记录中可能有'timestamp'字段，我们需要过滤掉
                messages.append({"role": msg["role"], "content": msg["content"]})
        
        # 2. 最后添加当前用户输入
        messages.append({"role": "user", "content": user_input})
        
        # 调试信息：查看发送的消息结构
        print(f"[API请求] 本次消息列表共 {len(messages)} 条")
        print(f"[API请求] 历史轮数: {len(conversation_history)//2 if conversation_history else 0}")
        
        data = {
            "model": "ernie-3.5-8k",
            "messages": messages,  # 现在这里包含了系统提示、历史对话和当前输入
            "max_tokens": 1024,
            "temperature": 0.7
        }
        
        try:
            # ============ 关键修复：强制忽略系统代理 ============
            proxies = {"http": None, "https": None}
            
            # 调试信息（发送请求时打印）
            print(f"[API请求] 发送请求，内容长度: {len(user_input)}")
            
            response = requests.post(
                url, 
                headers=headers, 
                json=data, 
                timeout=60,          # 总超时时间已足够
                proxies=proxies      # 核心修复：避免被系统代理阻塞
            )
            
            # 调试信息（收到响应时打印）
            print(f"[API响应] 状态码: {response.status_code}")
            
            response.raise_for_status()
            result = response.json()
            
            ai_reply = result["choices"][0]["message"]["content"]
            print(f"[API响应] 成功获取回复，长度: {len(ai_reply)}")
            
            # 对AI回复进行格式化处理
            formatted_reply = self._format_reply(ai_reply, user_input)
            return formatted_reply
            
        except requests.exceptions.Timeout:
            print("[API错误] 请求超时")
            return "抱歉，与AI服务的连接超时了，可能是网络较慢或服务繁忙，请稍后再试。"
        except requests.exceptions.ProxyError as e:
            print(f"[API错误] 代理设置错误: {e}")
            return "网络代理配置异常，请检查本地网络设置或联系管理员。"
        except requests.exceptions.ConnectionError as e:
            print(f"[API错误] 连接错误: {e}")
            return "无法连接到AI服务，请检查您的网络连接是否正常。"
        except requests.exceptions.RequestException as e:
            print(f"[API错误] 网络请求异常: {e}")
            return f"网络请求出错：{str(e)[:100]}"
        except (KeyError, json.JSONDecodeError) as e:
            print(f"[API错误] 解析响应失败: {e}")
            print(f"[API错误] 响应文本: {response.text[:500] if 'response' in locals() else '无响应'}")
            return f"处理AI响应时出错，请重试。"
        except Exception as e:
            print(f"[API错误] 未预期的异常: {e}")
            return "系统内部错误，请稍后再试。"

    def _format_reply(self, reply: str, user_input: str) -> str:
        """格式化AI回复，使其更易读"""
        if not reply:
            return reply
        
        # 1. 确保回复包含适当的换行
        formatted = reply
        
        # 2. 根据用户输入的关键词进行特殊格式化
        user_input_lower = user_input.lower()
        
        # 如果用户询问价格预算，特别格式化价格信息
        if any(keyword in user_input_lower for keyword in ['价格', '预算', '多少钱', '人均', '消费']):
            formatted = self._format_price_info(formatted)
        
        # 3. 确保列表项有适当的格式
        formatted = self._format_list_items(formatted)
        
        # 4. 确保段落之间有适当的间距
        formatted = self._format_paragraphs(formatted)
        
        # 5. 处理常见的Markdown格式
        formatted = self._format_markdown(formatted)
        
        return formatted
    
    def _format_price_info(self, text: str) -> str:
        """格式化价格信息"""
        lines = text.split('\n')
        formatted_lines = []
        
        for line in lines:
            # 查找并格式化价格信息
            import re
            # 匹配人民币符号和数字
            price_patterns = [
                r'(\d+)\s*元',
                r'¥\s*(\d+)',
                r'RMB\s*(\d+)',
                r'人均\s*(\d+)',
                r'预算\s*(\d+)'
            ]
            
            for pattern in price_patterns:
                matches = re.finditer(pattern, line)
                for match in matches:
                    # 在价格信息前后添加强调标记
                    price_text = match.group(0)
                    line = line.replace(price_text, f"**{price_text}**")
            
            formatted_lines.append(line)
        
        return '\n'.join(formatted_lines)
    
    def _format_list_items(self, text: str) -> str:
        """格式化列表项"""
        lines = text.split('\n')
        formatted_lines = []
        
        for i, line in enumerate(lines):
            stripped = line.strip()
            
            # 检查是否是列表项
            if (stripped.startswith('•') or 
                stripped.startswith('-') or 
                stripped.startswith('*') or
                stripped.startswith('1.') or
                stripped.startswith('2.') or
                stripped.startswith('3.') or
                stripped.startswith('4.') or
                stripped.startswith('5.')):
                # 确保列表项前面有适当的缩进
                if i > 0 and not formatted_lines[-1].endswith('\n\n'):
                    formatted_lines.append('')
                formatted_lines.append(line)
                # 确保列表项后面有适当的间距
                if i < len(lines) - 1 and not lines[i+1].strip().startswith(('•', '-', '*', '1.', '2.', '3.', '4.', '5.')):
                    formatted_lines.append('')
            else:
                formatted_lines.append(line)
        
        return '\n'.join(formatted_lines)
    
    def _format_paragraphs(self, text: str) -> str:
        """确保段落之间有适当的间距"""
        # 将多个换行符替换为两个换行符
        import re
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        # 确保句子之间有适当的间距
        lines = text.split('\n')
        formatted_lines = []
        
        for line in lines:
            if line.strip():  # 如果不是空行
                # 在中文句子后添加适当的间距
                sentences = re.split(r'([。！？])', line)
                formatted_sentences = []
                
                for j in range(0, len(sentences), 2):
                    if j < len(sentences) - 1:
                        formatted_sentences.append(sentences[j] + sentences[j+1])
                    else:
                        formatted_sentences.append(sentences[j])
                
                line = ''.join(formatted_sentences)
            
            formatted_lines.append(line)
        
        return '\n'.join(formatted_lines)
    
    def _format_markdown(self, text: str) -> str:
        """处理Markdown格式"""
        # 将**加粗**转换为HTML格式（前端会处理）
        # 这里我们只确保格式正确
        import re
        
        # 确保加粗格式正确
        text = re.sub(r'\*\*(.+?)\*\*', r'**\1**', text)
        
        # 确保标题格式正确
        lines = text.split('\n')
        formatted_lines = []
        
        for line in lines:
            # 检测标题格式
            if line.strip().startswith('###'):
                if formatted_lines and formatted_lines[-1] != '':
                    formatted_lines.append('')
                formatted_lines.append(line)
                formatted_lines.append('')
            elif line.strip().startswith('##'):
                if formatted_lines and formatted_lines[-1] != '':
                    formatted_lines.append('')
                formatted_lines.append(line)
                formatted_lines.append('')
            elif line.strip().startswith('#'):
                if formatted_lines and formatted_lines[-1] != '':
                    formatted_lines.append('')
                formatted_lines.append(line)
                formatted_lines.append('')
            else:
                formatted_lines.append(line)
        
        return '\n'.join(formatted_lines)


# 为了兼容原命令行版本，保留main函数
def main():
    """命令行版本的主函数"""
    import os
    from dotenv import load_dotenv
    
    load_dotenv()
    API_KEY = os.getenv('BAIDU_API_KEY', '')
    
    if not API_KEY:
        print("请设置环境变量 BAIDU_API_KEY")
        return
    
    bot = SimpleFoodBot(API_KEY)
    
    print("🤖 美食机器人已启动！输入'退出'结束对话")
    print("-" * 50)
    
    while True:
        try:
            user_input = input("\n你：").strip()
            
            if user_input.lower() in ['退出', 'exit', 'quit', 'q']:
                print("再见！")
                break
            
            reply = bot.ask(user_input)
            print(f"食探：{reply}")
            
        except KeyboardInterrupt:
            print("\n再见！")
            break
        except Exception as e:
            print(f"错误：{e}")


if __name__ == "__main__":
    main()