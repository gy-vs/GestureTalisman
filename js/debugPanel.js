/**
 * 通天箓 - 调试面板模块
 * 显示手势识别状态和系统信息
 */

class DebugPanel {
    constructor() {
        this.panel = document.getElementById('debugPanel');
        this.isVisible = false;
        
        // 元素引用
        this.elements = {
            handDetected: document.getElementById('debugHandDetected'),
            gesture: document.getElementById('debugGesture'),
            confidence: document.getElementById('debugConfidence'),
            fingers: document.getElementById('debugFingers'),
            state: document.getElementById('debugState'),
            pattern: document.getElementById('debugPattern'),
            fps: document.getElementById('debugFPS')
        };
        
        // 开关
        this.toggleSkeleton = document.getElementById('toggleSkeleton');
        this.toggleTrail = document.getElementById('toggleTrail');
        
        // 按钮
        this.btnDebug = document.getElementById('btnDebug');
        this.btnCloseDebug = document.getElementById('btnCloseDebug');
        
        // FPS计算
        this.frameCount = 0;
        this.lastFpsTime = performance.now();
        this.currentFps = 0;
        
        // 绑定事件
        this.bindEvents();
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        if (this.btnDebug) {
            this.btnDebug.addEventListener('click', () => this.toggle());
        }
        if (this.btnCloseDebug) {
            this.btnCloseDebug.addEventListener('click', () => this.hide());
        }
        
        // 快捷键 D
        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'd' && !e.ctrlKey && !e.metaKey) {
                this.toggle();
            }
        });
    }

    /**
     * 切换显示
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * 显示面板
     */
    show() {
        this.panel.classList.remove('hidden');
        this.btnDebug.classList.add('active');
        this.isVisible = true;
    }

    /**
     * 隐藏面板
     */
    hide() {
        this.panel.classList.add('hidden');
        this.btnDebug.classList.remove('active');
        this.isVisible = false;
    }

    /**
     * 更新手部检测状态
     * @param {boolean} detected 
     */
    updateHandDetected(detected) {
        this.elements.handDetected.textContent = detected ? '✅' : '❌';
        this.elements.handDetected.style.color = detected ? '#00FF88' : '#FF4444';
    }

    /**
     * 更新手势类型
     * @param {string} gesture 
     */
    updateGesture(gesture) {
        this.elements.gesture.textContent = gesture;
    }

    /**
     * 更新置信度
     * @param {number} confidence 0-1
     */
    updateConfidence(confidence) {
        const percent = Math.round(confidence * 100);
        this.elements.confidence.textContent = `${percent}%`;
        
        // 颜色渐变
        if (percent >= 80) {
            this.elements.confidence.style.color = '#00FF88';
        } else if (percent >= 50) {
            this.elements.confidence.style.color = '#FFAA00';
        } else {
            this.elements.confidence.style.color = '#FF4444';
        }
    }

    /**
     * 更新手指状态
     * @param {Array} fingerStates 5个布尔值
     */
    updateFingers(fingerStates) {
        if (!fingerStates || fingerStates.length !== 5) {
            this.elements.fingers.textContent = '-----';
            return;
        }
        
        const icons = fingerStates.map(s => s ? '👆' : '👇');
        this.elements.fingers.textContent = icons.join('');
    }

    /**
     * 更新系统状态
     * @param {string} state 
     */
    updateState(state) {
        this.elements.state.textContent = state;
        
        // 状态颜色映射 - 与 app.js 中的 STATE 枚举一致
        const colors = {
            'IDLE': '#666666',
            'READY': '#00D4FF',
            'DRAWING': '#FFD700',
            'CASTING': '#FF4500',
            'TALISMAN_RING': '#9400D3',
            'TALISMAN_PICKED': '#32CD32'
        };
        
        this.elements.state.style.color = colors[state] || '#00D4FF';
    }

    /**
     * 更新最后识别的图案
     * @param {string} pattern 
     * @param {boolean} success 
     */
    updatePattern(pattern, success = true) {
        this.elements.pattern.textContent = pattern + (success ? ' ✓' : ' ✗');
        this.elements.pattern.style.color = success ? '#00FF88' : '#FF4444';
    }

    /**
     * 更新FPS
     */
    updateFps() {
        this.frameCount++;
        
        const now = performance.now();
        const elapsed = now - this.lastFpsTime;
        
        if (elapsed >= 1000) {
            this.currentFps = Math.round((this.frameCount * 1000) / elapsed);
            this.frameCount = 0;
            this.lastFpsTime = now;
            
            this.elements.fps.textContent = this.currentFps;
            
            // FPS颜色
            if (this.currentFps >= 30) {
                this.elements.fps.style.color = '#00FF88';
            } else if (this.currentFps >= 20) {
                this.elements.fps.style.color = '#FFAA00';
            } else {
                this.elements.fps.style.color = '#FF4444';
            }
        }
    }

    /**
     * 批量更新
     * @param {Object} data 
     */
    update(data) {
        if (data.hasHand !== undefined) {
            this.updateHandDetected(data.hasHand);
        }
        if (data.gesture !== undefined) {
            this.updateGesture(data.gesture);
        }
        if (data.confidence !== undefined) {
            this.updateConfidence(data.confidence);
        }
        if (data.fingerStates !== undefined) {
            this.updateFingers(data.fingerStates);
        }
        if (data.state !== undefined) {
            this.updateState(data.state);
        }
        
        this.updateFps();
    }

    /**
     * 是否显示骨架
     * @returns {boolean}
     */
    shouldShowSkeleton() {
        return this.toggleSkeleton.checked;
    }

    /**
     * 是否显示轨迹
     * @returns {boolean}
     */
    shouldShowTrail() {
        return this.toggleTrail.checked;
    }
}

// 导出
window.DebugPanel = DebugPanel;
