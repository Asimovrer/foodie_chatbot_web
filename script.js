// 获取DOM元素
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const newChatBtn = document.getElementById('newChatBtn');
const surpriseBtn = document.getElementById('surpriseBtn');
const deleteHistoryBtn = document.getElementById('deleteHistoryBtn');
const starChatBtn = document.getElementById('starChatBtn');
const starNotification = document.getElementById('starNotification');
const starMessage = document.getElementById('starMessage');
const historyList = document.getElementById('historyList');
const particlesContainer = document.getElementById('particles-container');
const conversationCount = document.getElementById('conversationCount');
const currentConversationName = document.getElementById('currentConversationName');
const conversationStatus = document.getElementById('conversationStatus');

// 视频相关元素
const videoModal = document.getElementById('videoModal');
const closeVideoBtn = document.getElementById('closeVideoBtn');
const surpriseVideo = document.getElementById('surpriseVideo');

// 全局变量
let currentConversationId = null;
let selectedHistoryId = null;
let conversations = [];

// 初始化粒子流星效果
function initParticles() {
    // 创建大量粒子（增加数量）
    for (let i = 0; i < 300; i++) {
        createParticle();
    }
    
    // 创建流星
    setInterval(createStreak, 1500);
}

// 创建粒子
function createParticle() {
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    // 随机位置
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.top = `${Math.random() * 100}%`;
    
    // 随机大小
    const size = Math.random() * 4 + 1;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    
    // 随机颜色和RGB变色效果
    const hue = Math.floor(Math.random() * 360);
    let saturation = 70 + Math.random() * 30;
    let lightness = 50 + Math.random() * 30;
    
    particle.style.backgroundColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    
    // 添加RGB变色动画
    let currentHue = hue;
    let direction = 1;
    
    function animateColor() {
        currentHue += direction * 0.5;
        
        // 改变颜色方向
        if (currentHue >= 360) {
            currentHue = 360;
            direction = -1;
        } else if (currentHue <= 0) {
            currentHue = 0;
            direction = 1;
        }
        
        // 轻微改变饱和度和亮度
        saturation = 70 + Math.sin(Date.now() * 0.001 + hue) * 15;
        lightness = 50 + Math.cos(Date.now() * 0.0008 + hue) * 20;
        
        particle.style.backgroundColor = `hsl(${currentHue}, ${saturation}%, ${lightness}%)`;
        particle.style.boxShadow = `0 0 8px hsl(${currentHue}, ${saturation}%, ${lightness}%)`;
        
        requestAnimationFrame(animateColor);
    }
    
    animateColor();
    
    // 随机动画持续时间
    const duration = 15 + Math.random() * 25;
    particle.style.animationDuration = `${duration}s`;
    
    // 随机延迟
    const delay = Math.random() * 5;
    particle.style.animationDelay = `${delay}s`;
    
    particlesContainer.appendChild(particle);
    
    // 粒子移除后重新创建
    setTimeout(() => {
        particle.remove();
        createParticle();
    }, (duration + delay) * 1000);
}

// 创建流星
function createStreak() {
    const streak = document.createElement('div');
    streak.className = 'streak';
    
    // 随机起始位置
    const startX = Math.random() * 100;
    streak.style.left = `${startX}%`;
    streak.style.top = `${Math.random() * 30}%`;
    
    // 随机颜色
    const hue = Math.floor(Math.random() * 360);
    streak.style.background = `linear-gradient(90deg, transparent, hsl(${hue}, 80%, 70%) 30%, hsl(${hue}, 100%, 50%) 50%, hsl(${hue}, 80%, 70%) 70%, transparent)`;
    
    particlesContainer.appendChild(streak);
    
    // 流星持续时间
    setTimeout(() => {
        streak.remove();
    }, 3000);
}

// 初始化
document.addEventListener('DOMContentLoaded', async function() {
    // 初始化粒子效果
    initParticles();
    
    // 设置输入框自动调整高度
    messageInput.addEventListener('input', autoResizeTextarea);
    
    // 绑定事件监听器
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keydown', handleEnterKey);
    
    newChatBtn.addEventListener('click', handleNewChatClick);
    surpriseBtn.addEventListener('click', handleSurpriseClick);
    deleteHistoryBtn.addEventListener('click', handleDeleteHistoryClick);
    starChatBtn.addEventListener('click', handleStarChatClick);
    
    // 视频弹窗关闭事件
    closeVideoBtn.addEventListener('click', closeVideoModal);
    videoModal.addEventListener('click', function(e) {
        if (e.target === videoModal) {
            closeVideoModal();
        }
    });
    
    // 加载对话列表
    await loadConversations();
    
    // 初始化滚动到底部
    scrollToBottom();
});

// 自动调整输入框高度
function autoResizeTextarea() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
    if (this.scrollHeight > 120) {
        this.style.overflowY = 'scroll';
    } else {
        this.style.overflowY = 'hidden';
    }
}

// 加载对话列表
async function loadConversations() {
    try {
        const response = await fetch('/conversations');
        const data = await response.json();
        
        if (data.success) {
            conversations = data.conversations;
            currentConversationId = data.current_conversation_id;
            updateHistoryList();
            
            // 更新对话计数
            conversationCount.textContent = `(${conversations.length})`;
            
            // 如果没有当前对话，加载第一个对话
            if (currentConversationId && conversations.length > 0) {
                await loadCurrentConversation();
            } else if (conversations.length > 0) {
                // 如果没有设置当前对话，设置为第一个对话
                await selectHistoryItem(conversations[0].id);
            }
        } else {
            console.error('加载对话列表失败:', data.message);
            showNotification('加载对话列表失败');
        }
    } catch (error) {
        console.error('加载对话列表失败:', error);
        showNotification('网络错误，请刷新页面');
    }
}

// 更新历史记录列表
function updateHistoryList() {
    // 清空历史列表
    historyList.innerHTML = '';
    
    // 如果没有对话，显示提示
    if (conversations.length === 0) {
        historyList.innerHTML = `
            <div class="empty-history">
                <i class="fas fa-comments"></i>
                <p>暂无对话记录</p>
                <p>点击"新建对话"开始聊天</p>
            </div>
        `;
        return;
    }
    
    // 排序：星标对话置顶
    const sortedConversations = [...conversations].sort((a, b) => {
        if (a.starred && !b.starred) return -1;
        if (!a.starred && b.starred) return 1;
        return new Date(b.last_updated) - new Date(a.last_updated);
    });
    
    // 添加对话项
    sortedConversations.forEach(conv => {
        const historyItem = createHistoryItem(conv);
        historyList.appendChild(historyItem);
        
        // 如果这是当前对话，标记为选中
        if (conv.id === currentConversationId) {
            historyItem.classList.add('selected');
            selectedHistoryId = conv.id;
        }
    });
    
    // 更新按钮状态
    updateButtonsState();
}

// 创建历史记录项
function createHistoryItem(conversation) {
    const historyItem = document.createElement('div');
    historyItem.className = `history-item ${conversation.starred ? 'starred' : ''}`;
    historyItem.setAttribute('data-id', conversation.id);
    
    // 根据对话名称选择图标
    const icon = getConversationIcon(conversation.name);
    const timeAgo = getTimeAgo(conversation.last_updated);
    
    historyItem.innerHTML = `
        <div class="history-item-icon">
            <i class="fas ${icon}"></i>
        </div>
        <div class="history-item-content">
            <h4>${conversation.name}</h4>
            <p>${conversation.last_message || '无消息'} · ${timeAgo}</p>
        </div>
        <div class="history-item-checkbox"></div>
        ${conversation.starred ? '<div class="history-item-star"><i class="fas fa-star"></i></div>' : ''}
    `;
    
    // 添加点击事件
    historyItem.addEventListener('click', function(e) {
        // 如果点击了复选框区域，切换选择状态
        if (e.target.closest('.history-item-checkbox')) {
            toggleSelectHistoryItem(conversation.id);
        } else {
            // 否则切换对话
            selectHistoryItem(conversation.id);
        }
    });
    
    return historyItem;
}

// 获取对话图标
function getConversationIcon(name) {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('火锅') || lowerName.includes('辣') || lowerName.includes('川菜')) {
        return 'fa-pepper-hot';
    } else if (lowerName.includes('海鲜') || lowerName.includes('鱼')) {
        return 'fa-fish';
    } else if (lowerName.includes('生日') || lowerName.includes('蛋糕')) {
        return 'fa-birthday-cake';
    } else if (lowerName.includes('素食') || lowerName.includes('蔬菜')) {
        return 'fa-leaf';
    } else if (lowerName.includes('早餐') || lowerName.includes('早茶')) {
        return 'fa-mug-hot';
    } else if (lowerName.includes('晚餐') || lowerName.includes('宵夜')) {
        return 'fa-moon';
    } else if (lowerName.includes('推荐') || lowerName.includes('餐厅')) {
        return 'fa-utensils';
    } else if (lowerName.includes('北京') || lowerName.includes('烤鸭')) {
        return 'fa-drumstick-bite';
    } else if (lowerName.includes('上海') || lowerName.includes('小笼包')) {
        return 'fa-bread-slice';
    } else if (lowerName.includes('广东') || lowerName.includes('早茶')) {
        return 'fa-mug-hot';
    } else if (lowerName.includes('四川') || lowerName.includes('麻辣')) {
        return 'fa-pepper-hot';
    } else if (lowerName.includes('西安') || lowerName.includes('面食')) {
        return 'fa-wheat-awn';
    } else {
        return 'fa-comment';
    }
}

// 获取相对时间
function getTimeAgo(timestamp) {
    try {
        const now = new Date();
        const past = new Date(timestamp);
        const diffMs = now - past;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return '刚刚';
        if (diffMins < 60) return `${diffMins}分钟前`;
        if (diffHours < 24) return `${diffHours}小时前`;
        if (diffDays < 30) return `${diffDays}天前`;
        return '1月前';
    } catch (e) {
        return '刚刚';
    }
}

// 选择历史记录项（修复版：确保切换对话时正确加载历史）
async function selectHistoryItem(conversationId) {
    try {
        // 先显示加载状态
        const historyItem = document.querySelector(`.history-item[data-id="${conversationId}"]`);
        if (historyItem) {
            historyItem.classList.add('loading');
        }
        
        const response = await fetch('/conversations/switch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ conversation_id: conversationId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // 移除所有选中状态和加载状态
            document.querySelectorAll('.history-item').forEach(item => {
                item.classList.remove('selected', 'loading');
            });
            
            // 设置新的选中状态
            if (historyItem) {
                historyItem.classList.add('selected');
                selectedHistoryId = conversationId;
                currentConversationId = conversationId;
            }
            
            // 更新按钮状态
            updateButtonsState();
            
            // 更新对话信息
            const conversation = conversations.find(c => c.id === conversationId);
            if (conversation) {
                currentConversationName.textContent = conversation.name;
                conversationStatus.textContent = `在线 · ${conversation.message_count || 0} 条消息`;
            } else if (data.conversation_name) {
                currentConversationName.textContent = data.conversation_name;
                conversationStatus.textContent = '在线';
            }
            
            // 清空聊天区域并加载历史消息
            chatMessages.innerHTML = '';
            
            // 如果有历史消息，加载它们
            if (data.history && Array.isArray(data.history) && data.history.length > 0) {
                data.history.forEach(msg => {
                    if (msg.content && msg.role) {
                        addMessage(msg.content, msg.role === 'user' ? 'user' : 'ai');
                    }
                });
            } else {
                // 如果没有历史消息，显示欢迎消息
                addMessage("您好！我是食探AI，这是新的对话。请问今天想了解哪个地区或哪种类型的美食呢？", 'ai');
            }
            
            scrollToBottom();
        } else {
            alert('切换对话失败: ' + (data.message || '未知错误'));
            
            // 移除加载状态
            if (historyItem) {
                historyItem.classList.remove('loading');
            }
        }
    } catch (error) {
        console.error('切换对话失败:', error);
        alert('切换对话失败，请检查网络');
        
        // 移除加载状态
        const historyItem = document.querySelector(`.history-item[data-id="${conversationId}"]`);
        if (historyItem) {
            historyItem.classList.remove('loading');
        }
    }
}

// 切换选择历史记录项
function toggleSelectHistoryItem(conversationId) {
    const historyItem = document.querySelector(`.history-item[data-id="${conversationId}"]`);
    
    if (historyItem) {
        if (historyItem.classList.contains('selected')) {
            historyItem.classList.remove('selected');
            selectedHistoryId = null;
        } else {
            historyItem.classList.add('selected');
            selectedHistoryId = conversationId;
        }
        
        updateButtonsState();
    }
}

// 更新按钮状态
function updateButtonsState() {
    // 更新删除按钮状态
    deleteHistoryBtn.disabled = !selectedHistoryId;
    deleteHistoryBtn.title = selectedHistoryId ? '删除选中对话' : '请先选择对话';
    
    // 更新星标按钮状态
    if (selectedHistoryId) {
        const conversation = conversations.find(c => c.id === selectedHistoryId);
        if (conversation) {
            if (conversation.starred) {
                starChatBtn.classList.add('active');
                starChatBtn.innerHTML = '<i class="fas fa-star"></i>';
                starChatBtn.title = "取消标记";
            } else {
                starChatBtn.classList.remove('active');
                starChatBtn.innerHTML = '<i class="far fa-star"></i>';
                starChatBtn.title = "标记并置顶对话";
            }
            starChatBtn.disabled = false;
        }
    } else {
        starChatBtn.disabled = true;
        starChatBtn.title = "请先选择对话";
        starChatBtn.classList.remove('active');
        starChatBtn.innerHTML = '<i class="far fa-star"></i>';
    }
}

// 加载当前对话
async function loadCurrentConversation() {
    if (!currentConversationId) return;
    
    try {
        const response = await fetch('/conversations/switch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ conversation_id: currentConversationId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // 清空聊天区域
            chatMessages.innerHTML = '';
            
            // 更新对话信息
            const conversation = conversations.find(c => c.id === currentConversationId);
            if (conversation) {
                currentConversationName.textContent = conversation.name;
                conversationStatus.textContent = `在线 · ${conversation.message_count || 0} 条消息`;
            } else if (data.conversation_name) {
                currentConversationName.textContent = data.conversation_name;
                conversationStatus.textContent = '在线';
            }
            
            // 如果有历史消息，加载它们
            if (data.history && Array.isArray(data.history) && data.history.length > 0) {
                data.history.forEach(msg => {
                    if (msg.content && msg.role) {
                        addMessage(msg.content, msg.role === 'user' ? 'user' : 'ai');
                    }
                });
            } else {
                // 如果没有历史消息，显示欢迎消息
                addMessage("您好！我是食探AI，专注于全国美食推荐。我可以根据您的口味偏好、地理位置和用餐场景，为您推荐最合适的美食。请问今天想了解哪个地区或哪种类型的美食呢？", 'ai');
            }
            
            scrollToBottom();
        }
    } catch (error) {
        console.error('加载当前对话失败:', error);
        addMessage("欢迎使用食探AI！请问今天想了解什么美食呢？", 'ai');
    }
}

// 发送消息到Flask后端（修复版：确保在当前对话中发送）
async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;
    
    // 确保有当前对话
    if (!currentConversationId) {
        // 如果没有当前对话，创建一个
        await handleNewChatClick();
        if (!currentConversationId) return; // 用户取消了创建
    }
    
    // 添加用户消息到聊天区域
    addMessage(message, 'user');
    
    // 清空输入框
    messageInput.value = '';
    messageInput.style.height = '60px';
    
    // 显示AI正在输入的指示器
    showTypingIndicator();
    
    try {
        // 调用Flask后端API
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: message })
        });
        
        const data = await response.json();
        
        removeTypingIndicator();
        
        if (data.success) {
            addMessage(data.reply, 'ai');
            
            // 更新对话列表
            await loadConversations();
        } else {
            addMessage('抱歉，机器人暂时无法回复：' + data.reply, 'ai');
        }
        
        // 滚动到底部
        scrollToBottom();
        
    } catch (error) {
        removeTypingIndicator();
        console.error('Error:', error);
        addMessage('抱歉，网络请求失败，请检查网络连接。', 'ai');
        scrollToBottom();
    }
}

// 添加消息到聊天区域（增强版：格式化AI回复）
function addMessage(content, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${sender} ${sender}-message`;
    
    const avatarClass = sender === 'ai' ? 'ai-avatar' : 'user-avatar';
    const avatarIcon = sender === 'ai' ? 'fa-robot' : 'fa-user';
    
    const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    // 格式化内容
    let formattedContent = content;
    
    if (sender === 'ai') {
        // 对AI回复进行格式化处理
        formattedContent = formatAIResponse(content);
    }
    
    messageDiv.innerHTML = `
        <div class="avatar ${avatarClass}">
            <i class="fas ${avatarIcon}"></i>
        </div>
        <div class="message-content">
            <div class="message-text">${formattedContent}</div>
            <div class="message-time">${time}</div>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

// 格式化AI回复
function formatAIResponse(content) {
    if (!content) return '';
    
    let formatted = content;
    
    // 1. 将换行符转换为<br>标签
    formatted = formatted.replace(/\n/g, '<br>');
    
    // 2. 处理加粗文本（**文本**）
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // 3. 处理列表项
    formatted = formatted.replace(/<br>•\s*/g, '<br>• ');
    formatted = formatted.replace(/<br>\d+\.\s*/g, (match) => {
        return '<br>' + match.substring(4); // 移除<br>，保留数字和点
    });
    
    // 4. 添加段落间距
    formatted = formatted.replace(/<br><br>/g, '</p><p>');
    
    // 5. 确保内容包裹在段落标签中
    if (!formatted.startsWith('<p>')) {
        formatted = '<p>' + formatted;
    }
    if (!formatted.endsWith('</p>')) {
        formatted = formatted + '</p>';
    }
    
    return formatted;
}

// 显示AI正在输入指示器
function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message message-ai ai-message typing-indicator';
    typingDiv.id = 'typingIndicator';
    
    typingDiv.innerHTML = `
        <div class="avatar ai-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
            <div class="message-time">正在输入...</div>
        </div>
    `;
    
    chatMessages.appendChild(typingDiv);
    scrollToBottom();
}

// 移除正在输入指示器
function removeTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// 处理新建对话点击
async function handleNewChatClick() {
    const conversationName = prompt('请输入新对话的名称（可选）：', '新对话');
    
    if (conversationName === null) return; // 用户取消了
    
    try {
        const response = await fetch('/conversations/new', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: conversationName || '新对话' })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // 更新对话列表
            await loadConversations();
            
            // 显示成功消息
            showNotification('新对话创建成功！');
        } else {
            alert('创建新对话失败: ' + (data.message || '未知错误'));
        }
    } catch (error) {
        console.error('创建新对话失败:', error);
        alert('创建新对话失败，请检查网络');
    }
}

// 处理惊喜彩蛋点击
function handleSurpriseClick() {
    // 显示视频弹窗
    videoModal.classList.add('show');
    
    // 添加粒子特效增强
    enhanceParticlesForVideo();
    
    // 播放视频
    setTimeout(() => {
        surpriseVideo.play().catch(e => {
            console.log("自动播放被阻止，请手动点击播放");
            // 如果自动播放被阻止，显示提示
            showVideoPlayHint();
        });
    }, 500);
    
    // 添加键盘ESC关闭支持
    document.addEventListener('keydown', handleVideoModalKeydown);
}

// 关闭视频弹窗
function closeVideoModal() {
    videoModal.classList.remove('show');
    surpriseVideo.pause();
    surpriseVideo.currentTime = 0;
    
    // 移除键盘事件监听器
    document.removeEventListener('keydown', handleVideoModalKeydown);
    
    // 恢复粒子效果
    restoreParticles();
}

// 处理视频弹窗键盘事件
function handleVideoModalKeydown(e) {
    if (e.key === 'Escape' || e.key === 'Esc') {
        closeVideoModal();
    }
    
    // 空格键切换播放/暂停
    if (e.key === ' ') {
        e.preventDefault(); // 防止页面滚动
        if (surpriseVideo.paused) {
            surpriseVideo.play();
        } else {
            surpriseVideo.pause();
        }
    }
}

// 增强粒子效果（视频播放时）
function enhanceParticlesForVideo() {
    // 添加更多粒子
    for (let i = 0; i < 100; i++) {
        createParticle();
    }
    
    // 改变粒子颜色为更鲜艳
    document.querySelectorAll('.particle').forEach(particle => {
        particle.style.animationDuration = `${5 + Math.random() * 10}s`;
    });
    
    // 创建更多流星
    for (let i = 0; i < 5; i++) {
        setTimeout(() => createStreak(), i * 300);
    }
}

// 恢复粒子效果
function restoreParticles() {
    // 恢复粒子动画速度
    document.querySelectorAll('.particle').forEach(particle => {
        particle.style.animationDuration = `${15 + Math.random() * 25}s`;
    });
}

// 显示视频播放提示
function showVideoPlayHint() {
    const hint = document.createElement('div');
    hint.className = 'notification';
    hint.innerHTML = '请点击视频中央的播放按钮开始观看彩蛋！';
    hint.style.position = 'fixed';
    hint.style.top = '50%';
    hint.style.left = '50%';
    hint.style.transform = 'translate(-50%, -50%)';
    hint.style.zIndex = '10000';
    hint.style.background = 'var(--primary-color)';
    hint.style.color = 'white';
    hint.style.padding = '15px 25px';
    hint.style.borderRadius = 'var(--radius)';
    hint.style.boxShadow = 'var(--shadow)';
    
    document.body.appendChild(hint);
    
    setTimeout(() => {
        hint.style.opacity = '0';
        hint.style.transition = 'opacity 1s ease';
        setTimeout(() => hint.remove(), 1000);
    }, 3000);
}

// 处理删除历史记录点击
async function handleDeleteHistoryClick() {
    if (!selectedHistoryId) {
        alert("请先选择一个对话");
        return;
    }
    
    const conversation = conversations.find(c => c.id === selectedHistoryId);
    if (!conversation) return;
    
    if (confirm(`确定要删除对话 "${conversation.name}" 吗？此操作不可撤销。`)) {
        try {
            const response = await fetch('/conversations/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ conversation_id: selectedHistoryId })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // 更新对话列表
                await loadConversations();
                selectedHistoryId = null;
                showNotification('对话已删除');
            } else {
                alert('删除失败: ' + data.message);
            }
        } catch (error) {
            console.error('删除对话失败:', error);
            alert('删除失败，请检查网络');
        }
    }
}

// 处理星标对话点击
async function handleStarChatClick() {
    if (!selectedHistoryId) {
        alert("请先选择一个对话");
        return;
    }
    
    try {
        const response = await fetch('/conversations/star', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ conversation_id: selectedHistoryId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // 更新对话列表
            await loadConversations();
            
            // 显示通知
            starMessage.textContent = data.message;
            starNotification.classList.add('show');
            
            setTimeout(() => {
                starNotification.classList.remove('show');
            }, 2000);
        } else {
            alert('标记失败: ' + data.message);
        }
    } catch (error) {
        console.error('标记对话失败:', error);
        alert('标记失败，请检查网络');
    }
}

// 显示通知
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `<span>${message}</span>`;
    notification.style.position = 'fixed';
    notification.style.bottom = '30px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%) translateY(100px)';
    notification.style.zIndex = '1000';
    
    document.body.appendChild(notification);
    
    // 显示动画
    setTimeout(() => {
        notification.style.transform = 'translateX(-50%) translateY(0)';
        notification.style.transition = 'transform 0.5s ease';
    }, 100);
    
    // 3秒后消失
    setTimeout(() => {
        notification.style.transform = 'translateX(-50%) translateY(100px)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 500);
    }, 3000);
}

// 处理回车键发送
function handleEnterKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

// 滚动到底部
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}