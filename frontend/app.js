// Initialize visual platform layout icon layers automatically
lucide.createIcons();

// Elements Select Matrix
const sidebar = document.getElementById('sidebar');
const mobileToggle = document.getElementById('mobileToggle');
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const chatTitle = document.getElementById('chatTitle');
const modeButtons = document.querySelectorAll('.mode-btn');

let currentRoutingMode = 'HYBRID'; // Processing state architecture default configuration

// Manage Responsive Breakpoint Layout Switches
mobileToggle.addEventListener('click', () => {
    sidebar.classList.toggle('mobile-active');
});

// Capture and Update Processing Engine Router Configurations
modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelector('.mode-btn.active').classList.remove('active');
        btn.classList.add('active');
        currentRoutingMode = btn.getAttribute('data-mode');
    });
});

// Appends messages dynamically to the view window container
function injectMessageBubble(text, isUser, sourceType = 'ai') {
    const messageRow = document.createElement('div');
    messageRow.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
    
    if (!isUser) {
        const badgeHTML = sourceType === 'pdf' 
            ? `<div class="badge-row"><span class="source-badge pdf-badge"><i data-lucide="file-text" style="width:10px;height:10px;"></i> FROM PDF DOCUMENT DATASET</span></div>`
            : `<div class="badge-row"><span class="source-badge ai-badge"><i data-lucide="sparkles" style="width:10px;height:10px;"></i> ✨ AI GENERAL KNOWLEDGE MODE</span></div>`;
        
        // --- THE FIX: Pass the raw text through the markdown parser function ---
        const formattedBody = parseMarkdownToHTML(text);
        messageRow.innerHTML = badgeHTML + `<div class="message-content-body">${formattedBody}</div>`;
    } else {
        messageRow.innerText = text;
    }
    
    chatMessages.appendChild(messageRow);
    lucide.createIcons(); // Keep your UI icons synced
    chatMessages.scrollTop = chatMessages.scrollHeight; // Autoscroll down
}

// Renders the animation placeholder node while execution streams are active
function displayLoadingPlaceholder() {
    const loader = document.createElement('div');
    loader.className = 'message bot-message loading-bubble';
    loader.id = 'activeEngineLoader';
    loader.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
    chatMessages.appendChild(loader);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Discards loading placeholder node
function clearLoadingPlaceholder() {
    const loader = document.getElementById('activeEngineLoader');
    if (loader) loader.remove();
}

// Core Dispatched Event Transmission Routine Async Process
async function processExecutionStream() {
    const query = userInput.value.trim();
    if (!query) return;

    // Post interface changes instantly to client frame view
    injectMessageBubble(query, true);
    userInput.value = '';
    displayLoadingPlaceholder();

    try {
        // Dispatch structured API payload to the Python Flask backend server
        const networkStream = await fetch('http://127.0.0.1:5000/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: query,
                routing_mode: currentRoutingMode
            })
        });

        const data = await networkStream.json();
        clearLoadingPlaceholder();
        injectMessageBubble(data.reply, false, data.source_type);

    } catch (err) {
        clearLoadingPlaceholder();
        injectMessageBubble("Communication Loss Exception: Core logic framework interface missing or unavailable.", false, 'ai');
    }
}

// Operational Input Interface Hooks Setup
sendBtn.addEventListener('click', processExecutionStream);
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') processExecutionStream();
});

function parseMarkdownToHTML(text) {
    // 1. Protect code blocks or special syntax
    let html = text;

    // 2. Handle headers (### Header)
    html = html.replace(/^### (.*$)/gim, '<h3 class="chat-h3">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="chat-h2">$1</h2>');

    // 3. Fix the double-asterisk bolding glitch from the backend split loops
    html = html.replace(/\*\*\s*\*\*/g, ''); 

    // 4. Handle Bold text (**text**)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="chat-strong">$1</strong>');

    // 5. Clean up bullet points or numbered configurations starting lines
    html = html.replace(/^\s*[\*\-]\s+(.*$)/gim, '<li class="chat-li">$1</li>');
    html = html.replace(/^\s*(\d+)\.\s+(.*$)/gim, '<div class="chat-list-item"><span class="chat-num">$1.</span> $2</div>');

    // 6. Handle clean paragraph spacing transitions
    html = html.replace(/\n/g, '<br>');

    return html;
}