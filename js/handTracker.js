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
        this.landmarks = null;           // 第一只手（向后兼容）
        this.multiLandmarks = [];        // 所有手 (0, 1, 或 2 只)
        this.handedness = null;
        this.multiHandedness = [];       // 所有手的左右
        this.onResultsCallback = null;
        this.onProgressCallback = null;
        
        // 配置
        this.config = {
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.5
        };
        
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
        // 检查是否有本地模型（Docker环境或本地已下载）
        const useLocal = window.MEDIAPIPE_LOCAL === true;
        
        if (useLocal) {
            // 本地绝对路径
            const path = `/models/hands/${file}`;
            console.log(`[HandTracker] 使用本地模型: ${path}`);
            return path;
        } else {
            // CDN 路径
            const path = `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
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
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            this.landmarks = results.multiHandLandmarks[0];
            this.multiLandmarks = results.multiHandLandmarks;
            this.handedness = results.multiHandedness?.[0]?.label || 'Unknown';
            this.multiHandedness = results.multiHandedness?.map(h => h.label) || [];
        } else {
            this.landmarks = null;
            this.multiLandmarks = [];
            this.handedness = null;
            this.multiHandedness = [];
        }

        // 调用回调
        if (this.onResultsCallback) {
            this.onResultsCallback({
                landmarks: this.landmarks,
                multiLandmarks: this.multiLandmarks,
                handedness: this.handedness,
                multiHandedness: this.multiHandedness,
                hasHand: this.landmarks !== null,
                handCount: this.multiLandmarks.length
            });
        }
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
     * 获取双手关键点 (0, 1, 或 2 只手)
     * @returns {Array} [hand0, hand1, ...] 每只手包含21个关键点
     */
    getMultiLandmarks() {
        return this.multiLandmarks;
    }

    /**
     * 获取检测到的手数量
     * @returns {number} 0-2
     */
    getHandCount() {
        return this.multiLandmarks.length;
    }

    /**
     * 检测双手合十手势 - 提供独立方法供外部调用
     * @returns {boolean}
     */
    isPrayerGesture() {
        return this._detectPrayerGesture(this.multiLandmarks);
    }

    /**
     * 双手合十几何判定核心算法
     * 基于：掌心法向量夹角 + 指尖距离阈值 + 掌心距离阈值
     * @param {Array} multiLms - [leftHand, rightHand] 各含21点
     * @returns {boolean}
     */
    _detectPrayerGesture(multiLms) {
        if (!multiLms || multiLms.length !== 2) return false;
        const [handA, handB] = multiLms;
        if (!handA || !handB || handA.length !== 21 || handB.length !== 21) return false;

        const L = HandTracker.LANDMARKS;

        // ===== Step 1: 计算双手掌心法向量 =====
        // 三点定平面: WRIST(0), INDEX_MCP(5), PINKY_MCP(17) -> 求法向量
        const normalA = this._calculatePalmNormal(handA);
        const normalB = this._calculatePalmNormal(handB);
        if (!normalA || !normalB) return false;

        // 夹角: |cos(theta)| > 0.85 表示两掌心接近相对 (theta < 30度)
        const cosTheta = this._dot(normalA, normalB);
        const palmsOpposite = cosTheta < -0.85;  // 注意是负值！因为法向相对

        // ===== Step 2: 指尖距离检测 (手指朝上时，指尖y坐标应当接近) =====
        const fingertipsA = [handA[L.INDEX_TIP], handA[L.MIDDLE_TIP], handA[L.RING_TIP], handA[L.PINKY_TIP]];
        const fingertipsB = [handB[L.INDEX_TIP], handB[L.MIDDLE_TIP], handB[L.RING_TIP], handB[L.PINKY_TIP]];
        
        // A手所有手指对B手对应手指的平均距离（归一化：相对于手掌大小）
        const palmSizeA = this._distance(handA[L.WRIST], handA[L.MIDDLE_TIP]);
        let avgTipDistance = 0;
        for (let fi = 0; fi < 4; fi++) {
            avgTipDistance += this._distance(fingertipsA[fi], fingertipsB[fi]);
        }
        avgTipDistance /= 4;
        const normalizedTipDist = avgTipDistance / palmSizeA;
        const fingersClose = normalizedTipDist < 0.6;  // 指尖相对靠近

        // ===== Step 3: 掌心距离 =====
        const palmCenterA = this._avgPoint([handA[L.WRIST], handA[L.INDEX_MCP], handA[L.PINKY_MCP]]);
        const palmCenterB = this._avgPoint([handB[L.WRIST], handB[L.INDEX_MCP], handB[L.PINKY_MCP]]);
        const normalizedPalmDist = this._distance(palmCenterA, palmCenterB) / palmSizeA;
        const palmsClose = normalizedPalmDist < 0.8;

        // ===== Step 4: 检查手指方向 (指尖y都比掌腕小 = 在屏幕上更靠上) =====
        let fingersUpA = true, fingersUpB = true;
        for (let fi = 0; fi < 4; fi++) {
            if (fingertipsA[fi].y > handA[L.WRIST].y) fingersUpA = false;
            if (fingertipsB[fi].y > handB[L.WRIST].y) fingersUpB = false;
        }

        // ===== 综合判定 =====
        // 核心条件: 掌心相对 + (指尖近 或 掌心近) + 指尖朝上
        const prayerGesture = palmsOpposite && (fingersClose || palmsClose) && (fingersUpA || fingersUpB);
        
        // Debug输出
        // if (prayerGesture) {
        //     console.log('[Prayer] 法向夹角cos:', cosTheta.toFixed(3), 
        //                 '指尖归一化距离:', normalizedTipDist.toFixed(3),
        //                 '掌心归一化距离:', normalizedPalmDist.toFixed(3),
        //                 'fingersUp:', fingersUpA, fingersUpB);
        // }

        return prayerGesture;
    }

    /**
     * 计算掌心法向量（右手定则：腕→食MCP→小MCP 构成平面）
     * 返回: 单位化法向量 {x,y,z}
     */
    _calculatePalmNormal(landmarks) {
        const L = HandTracker.LANDMARKS;
        const wrist = landmarks[L.WRIST];
        const indexMcp = landmarks[L.INDEX_MCP];
        const pinkyMcp = landmarks[L.PINKY_MCP];

        // 向量: 腕 -> 食, 腕 -> 小
        const v1 = { x: indexMcp.x - wrist.x, y: indexMcp.y - wrist.y, z: (indexMcp.z || 0) - (wrist.z || 0) };
        const v2 = { x: pinkyMcp.x - wrist.x, y: pinkyMcp.y - wrist.y, z: (pinkyMcp.z || 0) - (wrist.z || 0) };

        // 叉乘求法向
        const normal = this._cross(v1, v2);
        const len = Math.sqrt(normal.x*normal.x + normal.y*normal.y + normal.z*normal.z);
        if (len === 0) return null;

        // 单位化
        normal.x /= len; normal.y /= len; normal.z /= len;
        return normal;
    }

    // 辅助: 向量点积
    _dot(a, b) { return a.x*b.x + a.y*b.y + a.z*b.z; }

    // 辅助: 向量叉乘
    _cross(a, b) {
        return {
            x: a.y * b.z - a.z * b.y,
            y: a.z * b.x - a.x * b.z,
            z: a.x * b.y - a.y * b.x
        };
    }

    // 辅助: 点距离
    _distance(p1, p2) {
        const dx = p1.x - p2.x, dy = p1.y - p2.y;
        const dz = (p1.z || 0) - (p2.z || 0);
        return Math.sqrt(dx*dx + dy*dy + dz*dz);
    }

    // 辅助: 点集平均
    _avgPoint(points) {
        let x = 0, y = 0, z = 0;
        for (const p of points) { x += p.x; y += p.y; z += p.z || 0; }
        return { x: x/points.length, y: y/points.length, z: z/points.length };
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
