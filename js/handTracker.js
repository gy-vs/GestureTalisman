/**
 * 通天箓 - 手势追踪模块
 * 基于MediaPipe Hands的手部关键点追踪
 */

class HandTracker {
    constructor() {
        this.hands = null;
        this.camera = null;
        this.isInitialized = false;
        this.isModelReady = false;
        this.landmarks = null;
        this.handedness = null;
        this.onResultsCallback = null;
        this.onProgressCallback = null;
        
        // 配置
        this.config = {
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.5
        };
        
        this.multiLandmarks = [];
        this.multiHandedness = [];
        
        // 预热相关
        this.warmupFrameCount = 0;
        this.warmupTarget = 3;
        this.warmupResolve = null;
    }

    /**
     * 设置进度回调
     */
    onProgress(callback) {
        this.onProgressCallback = callback;
    }

    /**
     * 获取模型文件路径（本地优先，CDN备用）
     */
    _getModelPath(file) {
        const useLocal = window.MEDIAPIPE_LOCAL === true;
        
        if (useLocal) {
            const path = `/models/hands/${file}`;
            console.log(`[HandTracker] 使用本地模型: ${path}`);
            return path;
        } else {
            // 使用指定版本号的CDN，确保兼容性
            const path = `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`;
            console.log(`[HandTracker] 使用CDN模型: ${path}`);
            return path;
        }
    }

    /**
     * 初始化MediaPipe Hands
     * @returns {Promise<boolean>}
     */
    async init() {
        try {
            // 检查MediaPipe是否加载
            if (typeof Hands === 'undefined') {
                console.error('[HandTracker] MediaPipe Hands 未加载');
                return false;
            }

            const useLocal = window.MEDIAPIPE_LOCAL === true;
            const sourceLabel = useLocal ? '本地' : 'CDN';
            
            this._reportProgress(`正在初始化手势识别引擎 (${sourceLabel})...`, 10);
            console.log(`[HandTracker] 模型来源: ${sourceLabel}`);

            this.hands = new Hands({
                locateFile: (file) => {
                    const path = this._getModelPath(file);
                    this._reportProgress(`正在加载模型: ${file}`, 20);
                    console.log(`[HandTracker] 加载: ${path}`);
                    return path;
                }
            });

            this._reportProgress('正在配置识别参数...', 40);
            this.hands.setOptions(this.config);
            
            this.hands.onResults((results) => {
                this.processResults(results);
            });

            this.isInitialized = true;
            this._reportProgress('模型初始化完成，准备预热...', 60);
            console.log('[HandTracker] MediaPipe Hands 初始化完成');
            return true;
        } catch (error) {
            console.error('[HandTracker] 初始化失败:', error);
            return false;
        }
    }

    /**
     * 预热模型 - 发送几帧确保模型完全加载
     * @param {HTMLVideoElement} video 
     * @returns {Promise<boolean>}
     */
    async warmup(video) {
        if (!this.isInitialized || !this.hands) {
            return false;
        }

        this._reportProgress('正在预热识别模型...', 70);
        console.log('[HandTracker] 开始模型预热...');

        return new Promise((resolve) => {
            this.warmupResolve = resolve;
            this.warmupFrameCount = 0;
            this.isModelReady = false;

            const doWarmup = async () => {
                try {
                    await this.hands.send({ image: video });
                    this.warmupFrameCount++;
                    
                    const progress = 70 + Math.round((this.warmupFrameCount / this.warmupTarget) * 25);
                    this._reportProgress(`模型预热中 (${this.warmupFrameCount}/${this.warmupTarget})...`, progress);

                    if (this.warmupFrameCount < this.warmupTarget) {
                        setTimeout(doWarmup, 100);
                    } else {
                        this.isModelReady = true;
                        this._reportProgress('手势识别已就绪！', 100);
                        console.log('[HandTracker] 模型预热完成，已就绪');
                        resolve(true);
                    }
                } catch (error) {
                    console.warn('[HandTracker] 预热帧处理:', error);
                    this.warmupFrameCount++;
                    if (this.warmupFrameCount < this.warmupTarget + 2) {
                        setTimeout(doWarmup, 150);
                    } else {
                        this.isModelReady = true;
                        this._reportProgress('手势识别已就绪！', 100);
                        resolve(true);
                    }
                }
            };

            doWarmup();
        });
    }

    /**
     * 报告进度
     */
    _reportProgress(message, percent) {
        if (this.onProgressCallback) {
            this.onProgressCallback(message, percent);
        }
    }

    /**
     * 检查模型是否就绪
     */
    isReady() {
        return this.isInitialized && this.isModelReady;
    }

    /**
     * 处理MediaPipe结果
     * @param {Object} results 
     */
    processResults(results) {
        this.multiLandmarks = results.multiHandLandmarks || [];
        this.multiHandedness = results.multiHandedness || [];
        
        if (this.multiLandmarks.length > 0) {
            this.landmarks = this.multiLandmarks[0];
            this.handedness = this.multiHandedness?.[0]?.label || 'Unknown';
        } else {
            this.landmarks = null;
            this.handedness = null;
        }

        if (this.onResultsCallback) {
            this.onResultsCallback({
                landmarks: this.landmarks,
                handedness: this.handedness,
                hasHand: this.landmarks !== null,
                multiLandmarks: this.multiLandmarks,
                multiHandedness: this.multiHandedness,
                handCount: this.multiLandmarks.length
            });
        }
    }

    getMultiLandmarks() {
        return this.multiLandmarks;
    }

    getHandCount() {
        return this.multiLandmarks.length;
    }

    /**
     * 发送帧进行处理
     * @param {HTMLVideoElement} video 
     */
    async send(video) {
        if (!this.isInitialized || !this.hands || !this.isModelReady) return;
        
        try {
            await this.hands.send({ image: video });
        } catch (error) {
            // 静默处理，避免频繁报错
        }
    }

    /**
     * 设置结果回调
     * @param {Function} callback 
     */
    setResultsCallback(callback) {
        this.onResultsCallback = callback;
    }

    /**
     * 获取当前关键点
     * @returns {Array|null} 21个关键点的数组
     */
    getLandmarks() {
        return this.landmarks;
    }

    /**
     * 获取特定关键点
     * @param {number} index 关键点索引 (0-20)
     * @returns {Object|null} {x, y, z}
     */
    getLandmark(index) {
        if (!this.landmarks || index < 0 || index > 20) return null;
        return this.landmarks[index];
    }

    /**
     * 获取指尖位置
     * 指尖索引: 4(拇指), 8(食指), 12(中指), 16(无名指), 20(小指)
     * @returns {Object} 各指尖坐标
     */
    getFingerTips() {
        if (!this.landmarks) return null;
        
        return {
            thumb: this.landmarks[4],
            index: this.landmarks[8],
            middle: this.landmarks[12],
            ring: this.landmarks[16],
            pinky: this.landmarks[20]
        };
    }

    /**
     * 获取手掌中心位置 (关键点0)
     * @returns {Object|null} {x, y, z}
     */
    getPalmCenter() {
        if (!this.landmarks) return null;
        return this.landmarks[0];
    }

    /**
     * 检测是否有手
     * @returns {boolean}
     */
    hasHand() {
        return this.landmarks !== null;
    }

    /**
     * 获取手的左右
     * @returns {string|null} 'Left' 或 'Right'
     */
    getHandedness() {
        return this.handedness;
    }

    /**
     * 销毁
     */
    destroy() {
        if (this.hands) {
            this.hands.close();
            this.hands = null;
        }
        this.isInitialized = false;
        console.log('[HandTracker] 已销毁');
    }
}

// 关键点索引常量
HandTracker.LANDMARKS = {
    WRIST: 0,
    THUMB_CMC: 1,
    THUMB_MCP: 2,
    THUMB_IP: 3,
    THUMB_TIP: 4,
    INDEX_MCP: 5,
    INDEX_PIP: 6,
    INDEX_DIP: 7,
    INDEX_TIP: 8,
    MIDDLE_MCP: 9,
    MIDDLE_PIP: 10,
    MIDDLE_DIP: 11,
    MIDDLE_TIP: 12,
    RING_MCP: 13,
    RING_PIP: 14,
    RING_DIP: 15,
    RING_TIP: 16,
    PINKY_MCP: 17,
    PINKY_PIP: 18,
    PINKY_DIP: 19,
    PINKY_TIP: 20
};

// 导出
window.HandTracker = HandTracker;
