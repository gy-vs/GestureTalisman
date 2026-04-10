/**
 * 通天箓 - 主程序
 * 简化版：手势直接召唤符箓 + 画符召唤
 */

class TongTianLuApp {
    constructor() {
        this.STATE = {
            IDLE: 'IDLE',
            READY: 'READY',
            DRAWING: 'DRAWING',
            CASTING: 'CASTING',
            TALISMAN_RING: 'TALISMAN_RING',
            TALISMAN_PICKED: 'TALISMAN_PICKED'
        };
        
        this.currentState = this.STATE.IDLE;
        
        // 模块实例
        this.camera = null;
        this.handTracker = null;
        this.gestureRecognizer = null;
        this.drawingCanvas = null;
        this.patternMatcher = null;
        this.particleEngine = null;
        this.effectsManager = null;
        this.debugPanel = null;
        this.talismanSystem = null;
        
        // OPEN_PALM hold tracking (for ring trigger)
        this.palmHoldStart = null;
        this.palmHoldThreshold = 1500;
        
        // 骨架画布
        this.skeletonCanvas = document.getElementById('skeletonCanvas');
        this.skeletonCtx = this.skeletonCanvas.getContext('2d');
        
        // UI元素
        this.cameraPrompt = document.getElementById('cameraPrompt');
        this.btnStartCamera = document.getElementById('btnStartCamera');
        this.modeIndicator = document.getElementById('modeIndicator');
        this.modeText = document.querySelector('.mode-text');
        this.hintText = document.getElementById('hintText');
        
        // 模拟模式
        this.simMode = false;
        this.simModeIndicator = document.getElementById('simModeIndicator');
        this.btnSimMode = document.getElementById('btnSimMode');
        this.simMousePos = { x: 0.5, y: 0.5 };
        this.simMouseDown = false;
        
        // 教程模式
        this.tutorialPanel = document.getElementById('tutorialPanel');
        this.btnTutorial = document.getElementById('btnTutorial');
        this.btnCloseTutorial = document.getElementById('btnCloseTutorial');
        this.tutorialVisible = false;
        
        // 画符相关
        this.drawingTimeout = null;
        this.lastDrawTime = 0;
        this.drawingGracePeriod = 1200;
        this.nonPointingFrames = 0;
        this.nonPointingThreshold = 5;
        
        // 手势进度显示
        this.progressRing = null;
        
        // 初始化
        this.init();
    }

    /**
     * 初始化应用
     */
    async init() {
        console.log('[App] 通天箓启动中...');
        
        this.camera = new CameraManager();
        this.handTracker = new HandTracker();
        this.gestureRecognizer = new GestureRecognizer();
        this.drawingCanvas = new DrawingCanvas();
        this.patternMatcher = new PatternMatcher();
        this.particleEngine = new ParticleEngine();
        this.effectsManager = new EffectsManager(this.particleEngine);
        this.debugPanel = new DebugPanel();
        this.talismanSystem = new TalismanSystem();
        
        this.talismanSystem.onActivate((talisman) => {
            this.castTalisman(talisman);
        });
        
        this.talismanSystem.onPick((picked) => {
            if (this.currentState === this.STATE.TALISMAN_RING) {
                this.setState(this.STATE.TALISMAN_PICKED);
                this.updateHint(`已提取: ${picked.name} | 🖐️ 张开手掌激活 | ✊ 握拳取消`);
            }
        });
        
        this.gestureRecognizer.onGestureTrigger((gesture, talisman) => {
            this.handleGestureTrigger(gesture, talisman);
        });
        
        // 创建进度环
        this.createProgressRing();
        
        // 调整画布尺寸
        this.resizeCanvases();
        window.addEventListener('resize', () => this.resizeCanvases());
        
        // 绑定事件
        this.bindEvents();
        
        console.log('[App] 初始化完成');
    }

    /**
     * 创建手势进度环
     */
    createProgressRing() {
        const ring = document.createElement('div');
        ring.id = 'gestureProgressRing';
        ring.className = 'gesture-progress-ring hidden';
        ring.innerHTML = `
            <svg viewBox="0 0 100 100">
                <circle class="progress-bg" cx="50" cy="50" r="45"/>
                <circle class="progress-fill" cx="50" cy="50" r="45"/>
            </svg>
            <div class="progress-icon"></div>
            <div class="progress-text"></div>
        `;
        document.body.appendChild(ring);
        this.progressRing = ring;
    }

    /**
     * 更新进度环
     */
    updateProgressRing(progress, gesture, x, y) {
        if (progress <= 0 || progress >= 1) {
            this.progressRing.classList.add('hidden');
            return;
        }
        
        this.progressRing.classList.remove('hidden');
        
        // 位置跟随
        if (x !== undefined && y !== undefined) {
            this.progressRing.style.left = `${x}px`;
            this.progressRing.style.top = `${y}px`;
        }
        
        // 更新进度
        const circle = this.progressRing.querySelector('.progress-fill');
        const circumference = 2 * Math.PI * 45;
        circle.style.strokeDasharray = circumference;
        circle.style.strokeDashoffset = circumference * (1 - progress);
        
        const icon = this.progressRing.querySelector('.progress-icon');
        const talisman = this.gestureRecognizer.getTalismanForGesture(gesture);
        if (gesture === this.gestureRecognizer.GESTURES.OPEN_PALM) {
            icon.textContent = '🖐️';
        } else {
            icon.textContent = talisman ? talisman.symbol : '✨';
        }
        
        // 更新文字
        const text = this.progressRing.querySelector('.progress-text');
        text.textContent = `${Math.round(progress * 100)}%`;
    }

    /**
     * 调整所有画布尺寸
     */
    resizeCanvases() {
        const container = document.querySelector('.main-stage');
        const rect = container.getBoundingClientRect();
        
        this.skeletonCanvas.width = rect.width;
        this.skeletonCanvas.height = rect.height;
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 启动摄像头
        if (this.btnStartCamera) {
            this.btnStartCamera.addEventListener('click', () => this.startCamera());
        } else {
            console.error('[App] btnStartCamera not found');
        }
        
        // 模拟模式
        if (this.btnSimMode) {
            this.btnSimMode.addEventListener('click', () => this.toggleSimMode());
        }
        
        // 教程
        if (this.btnTutorial) {
            this.btnTutorial.addEventListener('click', () => this.toggleTutorial());
        }
        if (this.btnCloseTutorial) {
            this.btnCloseTutorial.addEventListener('click', () => this.hideTutorial());
        }
        
        // 键盘快捷键
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        // 鼠标事件（模拟模式）
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        
        console.log('[App] 事件绑定完成');
    }

    /**
     * 启动摄像头
     */
    async startCamera() {
        this.btnStartCamera.disabled = true;
        this.btnStartCamera.innerHTML = '<span>启动中...</span>';
        
        const overlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');
        const loadingSub = document.querySelector('.loading-sub');
        const progressBar = this.createProgressBar(overlay);
        
        overlay.classList.remove('hidden');
        loadingText.textContent = '正在启动摄像头...';
        loadingSub.textContent = '请允许浏览器访问摄像头';
        this.updateLoadingProgress(progressBar, 5);
        
        const success = await this.camera.init();
        
        if (success) {
            this.cameraPrompt.classList.add('hidden');
            this.updateLoadingProgress(progressBar, 15);
            loadingText.textContent = '摄像头已就绪，正在加载手势模型...';
            loadingSub.textContent = '首次加载需要下载AI模型，请稍候';
            
            // 设置进度回调
            this.handTracker.onProgress((message, percent) => {
                loadingText.textContent = message;
                this.updateLoadingProgress(progressBar, percent);
            });
            
            // 初始化手势追踪器
            const initSuccess = await this.handTracker.init();
            
            if (!initSuccess) {
                loadingText.textContent = '手势模型加载失败';
                loadingSub.textContent = '请刷新页面重试';
                return;
            }
            
            // 预热模型 - 确保模型完全就绪
            loadingSub.textContent = '正在预热模型以获得最佳体验';
            await this.handTracker.warmup(this.camera.getVideoElement());
            
            // 设置结果回调
            this.handTracker.setResultsCallback((results) => {
                this.processHandResults(results);
            });
            
            loadingText.textContent = '✨ 手势识别已就绪！';
            loadingSub.textContent = '即将开始...';
            this.updateLoadingProgress(progressBar, 100);
            
            // 短暂延迟让用户看到完成状态
            await this.delay(500);
            
            this.startMainLoop();
            this.setState(this.STATE.READY);
            this.updateHint('👆 单指画符 | ✌️ 比耶→火符 | 🖐️ 张开手掌→符箓环绕');
            
            overlay.classList.add('fade-away');
            setTimeout(() => {
                overlay.classList.add('hidden');
                if (progressBar) progressBar.remove();
            }, 500);
            
            console.log('[App] 摄像头已启动，手势识别已就绪');
        } else {
            overlay.classList.add('hidden');
            this.btnStartCamera.disabled = false;
            this.btnStartCamera.innerHTML = '<span>重试</span>';
        }
    }

    /**
     * 创建进度条
     */
    createProgressBar(container) {
        let progressBar = container.querySelector('.loading-progress-bar');
        if (!progressBar) {
            progressBar = document.createElement('div');
            progressBar.className = 'loading-progress-bar';
            progressBar.innerHTML = `
                <div class="loading-progress-track">
                    <div class="loading-progress-fill"></div>
                </div>
                <div class="loading-progress-percent">0%</div>
            `;
            const content = container.querySelector('.loading-content');
            if (content) {
                content.appendChild(progressBar);
            }
        }
        return progressBar;
    }

    /**
     * 更新进度条
     */
    updateLoadingProgress(progressBar, percent) {
        if (!progressBar) return;
        const fill = progressBar.querySelector('.loading-progress-fill');
        const text = progressBar.querySelector('.loading-progress-percent');
        if (fill) fill.style.width = `${percent}%`;
        if (text) text.textContent = `${Math.round(percent)}%`;
    }

    /**
     * 延迟辅助函数
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 开始主循环
     */
    startMainLoop() {
        let frameCount = 0;
        
        const loop = async () => {
            // 只有在模型就绪时才发送帧
            if (this.camera.isRunning() && this.handTracker.isReady()) {
                await this.handTracker.send(this.camera.getVideoElement());
            }
            
            // 渲染画符轨迹
            if (this.drawingCanvas.isCurrentlyDrawing()) {
                this.drawingCanvas.render();
            }
            
            this.debugPanel.updateFps();
            frameCount++;
            requestAnimationFrame(loop);
        };
        
        console.log('[App] 主循环已启动');
        loop();
    }

    /**
     * 处理手部识别结果
     */
    processHandResults(results) {
        const { landmarks, hasHand, multiLandmarks } = results;
        
        // 绘制骨架
        if (hasHand && this.debugPanel.shouldShowSkeleton()) {
            this.drawBothHandsSkeletons(multiLandmarks);
        } else {
            this.skeletonCtx.clearRect(0, 0, this.skeletonCanvas.width, this.skeletonCanvas.height);
        }
        
        // 识别手势
        const gestureResult = this.gestureRecognizer.recognize(landmarks, multiLandmarks);
        
        // 更新调试面板
        this.debugPanel.update({
            hasHand: hasHand,
            gesture: this.gestureRecognizer.getGestureName(gestureResult.gesture),
            confidence: gestureResult.confidence,
            fingerStates: gestureResult.fingerStates,
            state: this.currentState
        });
        
        // 处理手势
        if (hasHand) {
            this.handleGesture(gestureResult, landmarks, multiLandmarks);
        } else {
            this.handleNoHand();
        }
    }

    /**
     * 绘制手部骨架
     */
    drawSkeleton(landmarks) {
        const ctx = this.skeletonCtx;
        const w = this.skeletonCanvas.width;
        const h = this.skeletonCanvas.height;
        
        ctx.clearRect(0, 0, w, h);
        
        const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4],
            [0, 5], [5, 6], [6, 7], [7, 8],
            [0, 9], [9, 10], [10, 11], [11, 12],
            [0, 13], [13, 14], [14, 15], [15, 16],
            [0, 17], [17, 18], [18, 19], [19, 20],
            [5, 9], [9, 13], [13, 17]
        ];
        
        ctx.strokeStyle = '#00D4FF';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00D4FF';
        ctx.shadowBlur = 5;
        
        connections.forEach(([i, j]) => {
            const p1 = landmarks[i];
            const p2 = landmarks[j];
            const x1 = (1 - p1.x) * w;
            const y1 = p1.y * h;
            const x2 = (1 - p2.x) * w;
            const y2 = p2.y * h;
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        });
        
        ctx.fillStyle = '#00D4FF';
        landmarks.forEach((p, i) => {
            const x = (1 - p.x) * w;
            const y = p.y * h;
            const radius = [4, 8, 12, 16, 20].includes(i) ? 6 : 4;
            
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        });
        
        ctx.shadowBlur = 0;
    }

    drawBothHandsSkeletons(multiLandmarks) {
        const ctx = this.skeletonCtx;
        const w = this.skeletonCanvas.width;
        const h = this.skeletonCanvas.height;
        ctx.clearRect(0, 0, w, h);
        
        if (!multiLandmarks || multiLandmarks.length === 0) return;
        
        const colors = ['#00D4FF', '#FF6B6B'];
        multiLandmarks.forEach((landmarks, idx) => {
            this.drawSingleHandSkeleton(ctx, landmarks, w, h, colors[idx % colors.length]);
        });
    }

    drawSingleHandSkeleton(ctx, landmarks, w, h, strokeColor) {
        const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4],
            [0, 5], [5, 6], [6, 7], [7, 8],
            [0, 9], [9, 10], [10, 11], [11, 12],
            [0, 13], [13, 14], [14, 15], [15, 16],
            [0, 17], [17, 18], [18, 19], [19, 20],
            [5, 9], [9, 13], [13, 17]
        ];
        
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.shadowColor = strokeColor;
        ctx.shadowBlur = 5;
        
        connections.forEach(([i, j]) => {
            const p1 = landmarks[i];
            const p2 = landmarks[j];
            const x1 = (1 - p1.x) * w;
            const y1 = p1.y * h;
            const x2 = (1 - p2.x) * w;
            const y2 = p2.y * h;
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        });
        
        ctx.fillStyle = strokeColor;
        landmarks.forEach((p, i) => {
            const x = (1 - p.x) * w;
            const y = p.y * h;
            const radius = [4, 8, 12, 16, 20].includes(i) ? 6 : 4;
            
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        });
        
        ctx.shadowBlur = 0;
    }

    /**
     * 处理手势
     */
    handleGesture(gestureResult, landmarks, multiLandmarks) {
        const { gesture, holdProgress } = gestureResult;
        const GESTURES = this.gestureRecognizer.GESTURES;
        const indexTip = landmarks[8];
        
        let screenX, screenY;
        if (gesture === GESTURES.PRAYER && multiLandmarks.length === 2) {
            const centerX = (1 - (multiLandmarks[0][0].x + multiLandmarks[1][0].x) / 2) * this.skeletonCanvas.width;
            const centerY = ((multiLandmarks[0][0].y + multiLandmarks[1][0].y) / 2) * this.skeletonCanvas.height;
            screenX = centerX;
            screenY = centerY;
        } else {
            const palmCenter = landmarks[0];
            screenX = (1 - palmCenter.x) * this.skeletonCanvas.width;
            screenY = palmCenter.y * this.skeletonCanvas.height;
        }

        if (this.currentState === this.STATE.TALISMAN_RING || 
            this.currentState === this.STATE.TALISMAN_PICKED) {
            this.updateProgressRing(0);
        } else if (this.currentState === this.STATE.READY && gesture === GESTURES.OPEN_PALM) {
            const palmProgress = this._getPalmHoldProgress();
            this.updateProgressRing(palmProgress, gesture, screenX, screenY);
        } else if (this.currentState === this.STATE.READY && 
            gesture !== GESTURES.POINTING && 
            gesture !== GESTURES.NONE &&
            gesture !== GESTURES.PINCH) {
            this.updateProgressRing(holdProgress, gesture, screenX, screenY);
        } else {
            this.updateProgressRing(0);
        }

        switch (this.currentState) {
            case this.STATE.READY:
                this.handleReadyState(gesture, indexTip, landmarks);
                break;
                
            case this.STATE.DRAWING:
                this.handleDrawingState(gesture, indexTip);
                break;
                
            case this.STATE.TALISMAN_RING:
                this.handleTalismanRingState(gesture, indexTip, landmarks);
                break;
                
            case this.STATE.TALISMAN_PICKED:
                this.handleTalismanPickedState(gesture);
                break;
                
            case this.STATE.CASTING:
                break;
        }
    }

    _getPalmHoldProgress() {
        if (!this.palmHoldStart) return 0;
        const elapsed = Date.now() - this.palmHoldStart;
        return Math.min(elapsed / this.palmHoldThreshold, 1);
    }

    handleReadyState(gesture, indexTip, landmarks) {
        const GESTURES = this.gestureRecognizer.GESTURES;
        
        if (gesture === GESTURES.POINTING) {
            this.palmHoldStart = null;
            this.startDrawing(indexTip);
        } else if (gesture === GESTURES.OPEN_PALM) {
            if (!this.palmHoldStart) {
                this.palmHoldStart = Date.now();
            } else if (Date.now() - this.palmHoldStart >= this.palmHoldThreshold) {
                this.palmHoldStart = null;
                this.showTalismanRing();
            }
        } else if (gesture !== GESTURES.PRAYER) {
            this.palmHoldStart = null;
        }
    }

    showTalismanRing() {
        this.setState(this.STATE.TALISMAN_RING);
        this.talismanSystem.show();
        this.updateProgressRing(0);
        this.updateHint('👆 指向符箓 → 🤏 捏合提取 | 👋 招手退出');
    }

    handleTalismanRingState(gesture, indexTip, landmarks) {
        const GESTURES = this.gestureRecognizer.GESTURES;
        this.gestureRecognizer.resetHoldTimer();

        if (gesture === GESTURES.WAVE) {
            this.talismanSystem.cancel();
            this.setState(this.STATE.READY);
            this.updateHint('👆 单指画符 | ✌️ 比耶→火符 | 🖐️ 张开手掌→符箓环绕');
            return;
        }

        if (gesture === GESTURES.PINCH) {
            const picked = this.talismanSystem.pickSelected();
            if (picked) {
                this.setState(this.STATE.TALISMAN_PICKED);
                this.updateHint(`已提取: ${picked.name} | 🖐️ 张开手掌激活 | 👋 招手取消`);
            }
            return;
        }

        // 白名单内 POINTING 或降级容错：食指伸展即视为指向
        if (gesture === GESTURES.POINTING || this.gestureRecognizer.fingerStates[1]) {
            this.talismanSystem.checkHoverByPosition(indexTip.x, indexTip.y);
        }
    }

    handleTalismanPickedState(gesture) {
        const GESTURES = this.gestureRecognizer.GESTURES;
        this.gestureRecognizer.resetHoldTimer();

        if (gesture === GESTURES.WAVE) {
            this.talismanSystem.cancel();
            this.setState(this.STATE.READY);
            this.updateHint('👆 单指画符 | ✌️ 比耶→火符 | 🖐️ 张开手掌→符箓环绕');
        } else if (gesture === GESTURES.OPEN_PALM) {
            const talisman = this.talismanSystem.activatePicked();
            if (talisman) {
                this.castTalisman(talisman);
            }
        }
    }

    /**
     * 开始画符
     */
    startDrawing(indexTip) {
        this.setState(this.STATE.DRAWING);
        this.drawingCanvas.startDrawing(indexTip.x, indexTip.y);
        this.lastDrawTime = Date.now();
        this.updateHint('✏️ 画符中... 完成图案后张开手掌释放');
    }

    /**
     * 处理画符状态
     */
    handleDrawingState(gesture, indexTip) {
        const GESTURES = this.gestureRecognizer.GESTURES;
        const now = Date.now();
        
        if (gesture === GESTURES.POINTING) {
            this.nonPointingFrames = 0;
            this.drawingCanvas.addPoint(indexTip.x, indexTip.y);
            this.lastDrawTime = now;
            
            if (this.drawingTimeout) {
                clearTimeout(this.drawingTimeout);
                this.drawingTimeout = null;
            }
            
        } else {
            this.nonPointingFrames++;
            
            if (this.nonPointingFrames < this.nonPointingThreshold) {
                return;
            }
            
            if (gesture === GESTURES.OPEN_PALM) {
                this.finishDrawing();
            } else if (gesture === GESTURES.FIST) {
                if (now - this.lastDrawTime > 800) {
                    this.cancelDrawing();
                }
            } else {
                if (!this.drawingTimeout && now - this.lastDrawTime > this.drawingGracePeriod) {
                    this.drawingTimeout = setTimeout(() => {
                        if (this.currentState === this.STATE.DRAWING) {
                            this.finishDrawing();
                        }
                    }, 800);
                }
            }
        }
    }

    /**
     * 完成画符
     */
    finishDrawing() {
        if (this.drawingTimeout) {
            clearTimeout(this.drawingTimeout);
            this.drawingTimeout = null;
        }
        
        const points = this.drawingCanvas.stopDrawing();
        
        // 匹配图案
        const match = this.patternMatcher.match(points);
        
        if (match) {
            // 播放成功动画
            const lastPoint = points[points.length - 1];
            const x = (1 - lastPoint.x) * this.skeletonCanvas.width;
            const y = lastPoint.y * this.skeletonCanvas.height;
            
            this.drawingCanvas.playSuccessAnimation();
            this.effectsManager.playDrawSuccess(x, y, match.element);
            this.debugPanel.updatePattern(match.name, true);
            
            // 直接释放特效
            this.castTalisman(match);
            
        } else {
            this.debugPanel.updatePattern('未识别', false);
            this.drawingCanvas.clear();
            this.setState(this.STATE.READY);
            this.updateHint('❌ 未识别图案，请重试画符');
        }
    }

    /**
     * 取消画符
     */
    cancelDrawing() {
        if (this.drawingTimeout) {
            clearTimeout(this.drawingTimeout);
            this.drawingTimeout = null;
        }
        
        this.drawingCanvas.clear();
        this.setState(this.STATE.READY);
        this.updateHint('✊ 已取消，重新开始');
    }

    /**
     * 手势触发符箓召唤
     */
    handleGestureTrigger(gesture, talisman) {
        if (this.currentState !== this.STATE.READY) return;
        
        console.log(`[App] 手势触发: ${this.gestureRecognizer.getGestureName(gesture)} → ${talisman.name}`);
        
        // 震动反馈（如果支持）
        if (navigator.vibrate) {
            navigator.vibrate(100);
        }
        
        // 释放符箓
        this.castTalisman(talisman);
    }

    /**
     * 释放符箓（带符纸展示和燃烧动画）
     */
    castTalisman(talisman) {
        this.setState(this.STATE.CASTING);
        this.updateProgressRing(0);
        
        // 步骤1: 显示符纸
        this.showTalismanPaper(talisman);
    }

    /**
     * 显示符纸（真实风格）
     */
    showTalismanPaper(talisman) {
        const paper = document.createElement('div');
        paper.className = 'talisman-paper';
        paper.innerHTML = this.createTalismanPaperSVG(talisman);
        document.body.appendChild(paper);
        
        // 步骤2: 0.8s后开始燃烧动画
        setTimeout(() => {
            paper.classList.add('burning');
            
            // 步骤3: 0.6s后移除符纸，触发特效
            setTimeout(() => {
                paper.remove();
                this.effectsManager.playElementEffect(talisman.element);
                
                // 恢复就绪状态
                setTimeout(() => {
                    this.setState(this.STATE.READY);
                    this.updateHint('👆 单指画符 | ✌️ 比耶→火符 | 🖐️ 张开手掌→符箓环绕');
                }, 2500);
            }, 600);
        }, 800);
    }

    /**
     * 创建符纸SVG（传统道教风格）
     */
    createTalismanPaperSVG(talisman) {
        const colors = {
            fire: { main: '#FF4500', accent: '#FFD700', bg: '#FFF8DC' },
            water: { main: '#1E90FF', accent: '#00CED1', bg: '#F0FFFF' },
            wood: { main: '#228B22', accent: '#32CD32', bg: '#F5FFFA' },
            metal: { main: '#DAA520', accent: '#FFD700', bg: '#FFFAF0' },
            earth: { main: '#8B4513', accent: '#CD853F', bg: '#FFF8DC' },
            ice: { main: '#00CED1', accent: '#E0FFFF', bg: '#F0FFFF' },
            thunder: { main: '#8B008B', accent: '#9400D3', bg: '#F8F0FF' },
            wind: { main: '#FF69B4', accent: '#FFB6C1', bg: '#FFF0F5' },
            purify: { main: '#FFFFFF', accent: '#E0FFFF', bg: '#FFFAFA' }
        };
        
        const c = colors[talisman.element] || colors.fire;
        
        return `
            <svg viewBox="0 0 200 320" class="talisman-svg">
                <defs>
                    <!-- 纸张纹理 -->
                    <filter id="paperTexture">
                        <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" result="noise"/>
                        <feDiffuseLighting in="noise" lighting-color="${c.bg}" surfaceScale="2">
                            <feDistantLight azimuth="45" elevation="60"/>
                        </feDiffuseLighting>
                    </filter>
                    <!-- 墨水效果 -->
                    <filter id="inkBleed">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="0.5"/>
                    </filter>
                    <!-- 发光效果 -->
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="blur"/>
                        <feMerge>
                            <feMergeNode in="blur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>
                
                <!-- 符纸背景 -->
                <rect x="5" y="5" width="190" height="310" rx="3" 
                      fill="${c.bg}" stroke="#D4A574" stroke-width="2"
                      filter="url(#paperTexture)"/>
                
                <!-- 边框装饰 -->
                <rect x="15" y="15" width="170" height="290" rx="2" 
                      fill="none" stroke="${c.main}" stroke-width="1.5" opacity="0.6"/>
                <rect x="20" y="20" width="160" height="280" rx="2" 
                      fill="none" stroke="${c.main}" stroke-width="0.5" opacity="0.4"/>
                
                <!-- 顶部天符 -->
                <g transform="translate(100, 50)" filter="url(#inkBleed)">
                    <text text-anchor="middle" font-size="24" font-weight="bold" 
                          fill="${c.main}" font-family="KaiTi, STKaiti, serif">敕令</text>
                </g>
                
                <!-- 中央主符文 -->
                <g transform="translate(100, 160)" filter="url(#glow)">
                    <text text-anchor="middle" font-size="72" fill="${c.main}" 
                          font-family="KaiTi, STKaiti, serif">${talisman.symbol}</text>
                </g>
                
                <!-- 符箓名称 -->
                <g transform="translate(100, 240)">
                    <text text-anchor="middle" font-size="28" font-weight="bold"
                          fill="${c.main}" font-family="KaiTi, STKaiti, serif">${talisman.name}</text>
                </g>
                
                <!-- 底部法印 -->
                <g transform="translate(100, 290)">
                    <circle cx="0" cy="0" r="18" fill="none" stroke="#C41E3A" stroke-width="2"/>
                    <text text-anchor="middle" y="6" font-size="14" fill="#C41E3A" 
                          font-family="KaiTi, STKaiti, serif">法印</text>
                </g>
                
                <!-- 装饰纹路 -->
                <g stroke="${c.accent}" stroke-width="0.8" fill="none" opacity="0.5">
                    <path d="M30,80 Q50,75 70,80 Q90,85 100,80"/>
                    <path d="M100,80 Q110,75 130,80 Q150,85 170,80"/>
                    <path d="M30,260 Q50,265 70,260 Q90,255 100,260"/>
                    <path d="M100,260 Q110,265 130,260 Q150,255 170,260"/>
                </g>
            </svg>
        `;
    }

    /**
     * 处理无手检测
     */
    handleNoHand() {
        this.updateProgressRing(0);
        this.palmHoldStart = null;
        
        if (this.currentState === this.STATE.DRAWING) {
            const now = Date.now();
            if (now - this.lastDrawTime > this.drawingGracePeriod * 2) {
                this.finishDrawing();
            }
        } else if (this.currentState === this.STATE.TALISMAN_RING) {
            this.talismanSystem.cancel();
            this.setState(this.STATE.READY);
            this.updateHint('👆 单指画符 | ✌️ 比耶→火符 | 🖐️ 张开手掌→符箓环绕');
        } else if (this.currentState === this.STATE.TALISMAN_PICKED) {
            this.talismanSystem.cancel();
            this.setState(this.STATE.READY);
            this.updateHint('👆 单指画符 | ✌️ 比耶→火符 | 🖐️ 张开手掌→符箓环绕');
        }
    }

    /**
     * 设置状态
     */
    setState(state) {
        this.currentState = state;
        
        const indicator = this.modeIndicator;
        indicator.classList.remove('active', 'drawing');
        
        const labels = {
            [this.STATE.DRAWING]: ['drawing', '画符中'],
            [this.STATE.READY]: ['active', '就绪'],
            [this.STATE.CASTING]: [null, '释放中'],
            [this.STATE.TALISMAN_RING]: ['active', '符箓选择'],
            [this.STATE.TALISMAN_PICKED]: ['active', '符箓提取'],
        };
        
        const [cls, label] = labels[state] || [null, '待机中'];
        if (cls) indicator.classList.add(cls);
        this.modeText.textContent = label;
        
        this.debugPanel.updateState(state);
    }

    /**
     * 更新提示文本
     */
    updateHint(text) {
        this.hintText.innerHTML = `<span class="hint-icon">✨</span><span>${text}</span>`;
    }

    // ==================== 模拟模式 ====================

    toggleSimMode() {
        this.simMode = !this.simMode;
        
        if (this.simMode) {
            this.simModeIndicator.classList.remove('hidden');
            this.btnSimMode.classList.add('active');
            this.cameraPrompt.classList.add('hidden');
            this.setState(this.STATE.READY);
            this.updateHint('模拟模式：鼠标拖拽画符 | 数字键1-8触发符箓 | 9 符箓环绕');
        } else {
            this.simModeIndicator.classList.add('hidden');
            this.btnSimMode.classList.remove('active');
        }
    }

    handleKeyDown(e) {
        // 快捷键（任何模式下）
        if (e.key.toLowerCase() === 'm') {
            this.toggleSimMode();
            return;
        }
        if (e.key.toLowerCase() === 't') {
            this.toggleTutorial();
            return;
        }
        
        if (!this.simMode) return;
        
        // 模拟模式下的数字键触发符箓
        const keyMap = {
            '1': { element: 'fire', name: '火符', symbol: '🔥' },
            '2': { element: 'ice', name: '冰符', symbol: '❄️' },
            '3': { element: 'water', name: '水符', symbol: '💧' },
            '4': { element: 'thunder', name: '雷符', symbol: '💜' },
            '5': { element: 'wind', name: '风符', symbol: '🌸' },
            '6': { element: 'earth', name: '土符', symbol: '🌍' },
            '7': { element: 'wood', name: '木符', symbol: '🌿' },
            '8': { element: 'metal', name: '金符', symbol: '⚡' }
        };
        
        if (e.key === '9') {
            if (this.currentState === this.STATE.READY) {
                this.showTalismanRing();
            } else if (this.currentState === this.STATE.TALISMAN_RING || 
                       this.currentState === this.STATE.TALISMAN_PICKED) {
                this.talismanSystem.cancel();
                this.setState(this.STATE.READY);
                this.updateHint('模拟模式：鼠标拖拽画符 | 数字键触发符箓 | 9 符箓环绕');
            }
            return;
        }
        
        if (keyMap[e.key] && this.currentState !== this.STATE.CASTING) {
            this.castTalisman(keyMap[e.key]);
        }
    }

    handleMouseMove(e) {
        if (!this.simMode) return;
        
        this.simMousePos = {
            x: e.clientX / window.innerWidth,
            y: e.clientY / window.innerHeight
        };
        
        if (this.simMouseDown && this.currentState === this.STATE.DRAWING) {
            this.drawingCanvas.addPointDirect(this.simMousePos.x, this.simMousePos.y);
        }
    }

    handleMouseDown(e) {
        if (!this.simMode) return;
        if (e.target.closest('.debug-panel, .tutorial-panel, .top-bar, .bottom-bar, .talisman-ring, .talisman-zoom')) return;
        
        this.simMouseDown = true;
        
        if (this.currentState === this.STATE.READY) {
            this.setState(this.STATE.DRAWING);
            this.drawingCanvas.startDrawingDirect(this.simMousePos.x, this.simMousePos.y);
            this.lastDrawTime = Date.now();
            this.updateHint('模拟画符中... 松开鼠标完成');
        }
    }

    handleMouseUp(e) {
        if (!this.simMode) return;
        
        this.simMouseDown = false;
        
        if (this.currentState === this.STATE.DRAWING) {
            this.finishDrawing();
        }
    }

    // ==================== 教程 ====================

    toggleTutorial() {
        if (this.tutorialVisible) {
            this.hideTutorial();
        } else {
            this.showTutorial();
        }
    }

    showTutorial() {
        this.tutorialPanel.classList.remove('hidden');
        this.btnTutorial.classList.add('active');
        this.tutorialVisible = true;
    }

    hideTutorial() {
        this.tutorialPanel.classList.add('hidden');
        this.btnTutorial.classList.remove('active');
        this.tutorialVisible = false;
    }
}

// 启动应用（等待 MediaPipe 加载完成）
document.addEventListener('DOMContentLoaded', () => {
    // 等待 MediaPipe 脚本加载完成
    function waitForMediaPipe() {
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                // 检查 Hands 类是否可用
                if (typeof Hands !== 'undefined') {
                    clearInterval(checkInterval);
                    console.log('[App] MediaPipe Hands 已加载');
                    resolve(true);
                }
            }, 100);
            
            // 超时处理（10秒）
            setTimeout(() => {
                clearInterval(checkInterval);
                console.error('[App] MediaPipe 加载超时');
                resolve(false);
            }, 10000);
        });
    }
    
    waitForMediaPipe().then((loaded) => {
        if (loaded) {
            window.app = new TongTianLuApp();
            console.log('✨ 通天箓已就绪');
        } else {
            console.error('❌ MediaPipe 加载失败，请刷新页面重试');
            // 显示错误提示
            const prompt = document.getElementById('cameraPrompt');
            if (prompt) {
                const desc = prompt.querySelector('.camera-prompt__desc');
                if (desc) {
                    desc.textContent = 'MediaPipe 加载失败，请检查网络连接后刷新页面';
                    desc.style.color = '#FF4444';
                }
            }
        }
    });
});
