/**
 * 通天箓 - 手势识别模块
 * 基于关键点判断手势类型，支持手势召唤符箓
 */

class GestureRecognizer {
    constructor() {
        this.GESTURES = {
            NONE: 'none',
            OPEN_PALM: 'open_palm',
            FIST: 'fist',
            POINTING: 'pointing',
            PEACE: 'peace',
            ROCK: 'rock',
            SIX: 'six',
            OK: 'ok',
            THREE: 'three',
            PINCH: 'pinch',
            THUMBS_UP: 'thumbs_up',
            WAVE: 'wave'
        };

        this.GESTURE_TALISMAN_MAP = {
            [this.GESTURES.PEACE]: { element: 'fire', name: '火符', symbol: '🔥' },
            [this.GESTURES.SIX]: { element: 'ice', name: '冰符', symbol: '❄️' },
            [this.GESTURES.OK]: { element: 'water', name: '水符', symbol: '💧' },
            [this.GESTURES.ROCK]: { element: 'thunder', name: '雷符', symbol: '💜' },
            [this.GESTURES.THUMBS_UP]: { element: 'wind', name: '风符', symbol: '🌸' },
            [this.GESTURES.FIST]: { element: 'earth', name: '土符', symbol: '🌍' },
            [this.GESTURES.THREE]: { element: 'wood', name: '木符', symbol: '🌿' }
        };

        // 当前状态
        this.currentGesture = this.GESTURES.NONE;
        this.confidence = 0;
        this.fingerStates = [false, false, false, false, false]; // 拇指到小指

        // 阈值配置
        this.thresholds = {
            fingerExtended: 0.08,    // 手指伸展判定阈值（降低使更容易检测）
            fingerCurled: 0.05,      // 手指弯曲判定阈值
            pinchDistance: 0.08,     // 捏合距离阈值
            holdTime: 2000,          // 手势保持时间触发(ms)
            pointingCurlRatio: 0.7   // 单指手势：其他手指弯曲比例阈值
        };

        // 手势保持计时
        this.gestureHoldStart = null;
        this.lastGesture = this.GESTURES.NONE;
        this.gestureTriggered = false;

        // 手势触发回调
        this.onGestureTriggerCallback = null;

        // 双手合十检测回调
        this.onPrayerGestureCallback = null;

        // 招手检测：手腕 x 坐标历史
        this.wristHistory = [];
        this.waveDetected = false;
        this.waveCooldown = 0;

        // 双手合十检测状态
        this.prayerHoldStart = null;
        this.prayerTriggered = false;
        this.prayerHoldTime = 1500; // 合十保持时间触发(ms)
    }

    /**
     * 判断手指是否伸展（改进版：使用多种判断方法）
     */
    isFingerExtended(landmarks, tipIndex, pipIndex, mcpIndex) {
        if (!landmarks) return false;
        
        const tip = landmarks[tipIndex];
        const pip = landmarks[pipIndex];
        const mcp = landmarks[mcpIndex];
        const wrist = landmarks[0];

        // 拇指特殊处理
        if (tipIndex === 4) {
            const thumbTip = landmarks[4];
            const thumbMcp = landmarks[2];
            const indexMcp = landmarks[5];
            
            const tipToIndex = this.distance(thumbTip, indexMcp);
            const mcpToIndex = this.distance(thumbMcp, indexMcp);
            
            return tipToIndex > mcpToIndex * 0.55;
        }

        // 方法1: 指尖到手腕的距离 vs PIP到手腕的距离
        const tipToWrist = this.distance(tip, wrist);
        const pipToWrist = this.distance(pip, wrist);
        const isExtendedByDistance = tipToWrist > pipToWrist * 1.1;

        // 方法2: y坐标比较（指尖在PIP上方）
        const isExtendedByY = tip.y < pip.y - this.thresholds.fingerExtended;

        // 方法3: 手指伸直度（tip-pip-mcp三点共线程度）
        const straightness = this.getFingerStraightness(tip, pip, mcp);
        const isExtendedByStraight = straightness > 0.85;

        // 综合判断：至少满足2个条件
        const votes = [isExtendedByDistance, isExtendedByY, isExtendedByStraight].filter(Boolean).length;
        return votes >= 2;
    }

    /**
     * 判断手指是否弯曲（用于检测其他手指是否收起）
     */
    isFingerCurled(landmarks, tipIndex, pipIndex, mcpIndex) {
        if (!landmarks) return true;
        
        const tip = landmarks[tipIndex];
        const pip = landmarks[pipIndex];
        const mcp = landmarks[mcpIndex];
        const wrist = landmarks[0];

        // 方法1: 指尖到手腕的距离 vs MCP到手腕的距离
        const tipToWrist = this.distance(tip, wrist);
        const mcpToWrist = this.distance(mcp, wrist);
        const isCurledByDistance = tipToWrist < mcpToWrist * 1.3;

        // 方法2: 指尖在PIP下方或接近
        const isCurledByY = tip.y > pip.y - this.thresholds.fingerCurled;

        // 方法3: 手指弯曲度
        const straightness = this.getFingerStraightness(tip, pip, mcp);
        const isCurledByStraight = straightness < 0.75;

        // 满足任意2个条件即认为弯曲
        const votes = [isCurledByDistance, isCurledByY, isCurledByStraight].filter(Boolean).length;
        return votes >= 2;
    }

    /**
     * 计算手指的伸直程度 (0-1, 1为完全伸直)
     */
    getFingerStraightness(tip, pip, mcp) {
        const d1 = this.distance(mcp, pip);
        const d2 = this.distance(pip, tip);
        const d3 = this.distance(mcp, tip);
        
        // 如果完全伸直，d3 ≈ d1 + d2
        const maxLength = d1 + d2;
        if (maxLength === 0) return 0;
        
        return Math.min(d3 / maxLength, 1);
    }

    /**
     * 计算两点距离
     */
    distance(p1, p2) {
        if (!p1 || !p2) return Infinity;
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dz = (p1.z || 0) - (p2.z || 0);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * 更新手指状态
     */
    updateFingerStates(landmarks) {
        if (!landmarks) {
            this.fingerStates = [false, false, false, false, false];
            return;
        }

        // [拇指, 食指, 中指, 无名指, 小指]
        this.fingerStates[0] = this.isFingerExtended(landmarks, 4, 3, 2);   // 拇指
        this.fingerStates[1] = this.isFingerExtended(landmarks, 8, 6, 5);   // 食指
        this.fingerStates[2] = this.isFingerExtended(landmarks, 12, 10, 9); // 中指
        this.fingerStates[3] = this.isFingerExtended(landmarks, 16, 14, 13);// 无名指
        this.fingerStates[4] = this.isFingerExtended(landmarks, 20, 18, 17);// 小指
    }

    /**
     * 检测OK手势（拇指和食指形成圆圈）
     */
    isOKGesture(landmarks) {
        if (!landmarks) return false;
        
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const distance = this.distance(thumbTip, indexTip);
        
        // 拇指和食指接近，且其他手指伸展
        return distance < 0.1 && this.fingerStates[2] && this.fingerStates[3] && this.fingerStates[4];
    }

    /**
     * 识别手势
     */
    /**
     * 检测比6的备选逻辑：小指伸展 + 拇指尖到小指尖距离大
     */
    isSixGestureBackup(landmarks) {
        if (!landmarks) return false;
        const thumbTip = landmarks[4];
        const pinkyTip = landmarks[20];
        const wrist = landmarks[0];
        const spread = this.distance(thumbTip, pinkyTip);
        const handSize = this.distance(wrist, landmarks[12]);
        return spread > handSize * 0.8;
    }

    /**
     * 检测捏合手势
     */
    isPinchGesture(landmarks) {
        if (!landmarks) return false;
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        return this.distance(thumbTip, indexTip) < this.thresholds.pinchDistance;
    }

    /**
     * 检测招手手势（手腕水平往返运动）
     */
    detectWave(landmarks) {
        if (!landmarks) {
            this.wristHistory = [];
            return false;
        }

        const now = Date.now();

        if (now < this.waveCooldown) return false;

        const wristX = landmarks[0].x;
        this.wristHistory.push({ x: wristX, t: now });

        // 只保留最近 1000ms
        while (this.wristHistory.length > 0 && now - this.wristHistory[0].t > 1000) {
            this.wristHistory.shift();
        }

        if (this.wristHistory.length < 6) return false;

        // 在 800ms 窗口内统计方向反转次数和振幅
        let reversals = 0;
        let dir = 0; // 0=unknown, 1=right, -1=left
        let minX = Infinity, maxX = -Infinity;
        const windowStart = now - 800;

        for (let i = 1; i < this.wristHistory.length; i++) {
            if (this.wristHistory[i].t < windowStart) continue;

            const dx = this.wristHistory[i].x - this.wristHistory[i - 1].x;
            minX = Math.min(minX, this.wristHistory[i].x);
            maxX = Math.max(maxX, this.wristHistory[i].x);

            if (Math.abs(dx) < 0.005) continue;

            const newDir = dx > 0 ? 1 : -1;
            if (dir !== 0 && newDir !== dir) {
                reversals++;
            }
            dir = newDir;
        }

        const amplitude = maxX - minX;

        if (reversals >= 2 && amplitude > 0.08) {
            this.wristHistory = [];
            this.waveCooldown = now + 1500;
            return true;
        }

        return false;
    }

    /**
     * 计算三点构成的平面法向量
     */
    getNormalVector(p1, p2, p3) {
        const v1 = { x: p2.x - p1.x, y: p2.y - p1.y, z: p2.z - p1.z };
        const v2 = { x: p3.x - p1.x, y: p3.y - p1.y, z: p3.z - p1.z };

        const nx = v1.y * v2.z - v1.z * v2.y;
        const ny = v1.z * v2.x - v1.x * v2.z;
        const nz = v1.x * v2.y - v1.y * v2.x;

        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        if (len === 0) return { x: 0, y: 0, z: 1 };

        return { x: nx / len, y: ny / len, z: nz / len };
    }

    /**
     * 计算两个向量的夹角（弧度）
     */
    getAngleBetween(v1, v2) {
        const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
        const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
        const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);

        if (len1 === 0 || len2 === 0) return 0;

        const cosAngle = Math.max(-1, Math.min(1, dot / (len1 * len2)));
        return Math.acos(cosAngle);
    }

    /**
     * 检测双手合十手势
     * 条件：
     * 1. 两只手都存在
     * 2. 双手掌心相对（手腕法向量夹角接近180度）
     * 3. 指尖朝上（手腕到中指方向向上）
     * 4. 双手距离较近
     */
    detectPrayerGesture(leftHand, rightHand) {
        if (!leftHand || !rightHand || leftHand.length !== 21 || rightHand.length !== 21) {
            this.prayerHoldStart = null;
            return false;
        }

        // 获取手腕位置
        const leftWrist = leftHand[0];
        const rightWrist = rightHand[0];

        // 获取中指根部和指尖（用于判断手掌方向）
        const leftMiddleMCP = leftHand[9];
        const leftMiddleTip = leftHand[12];
        const rightMiddleMCP = rightHand[9];
        const rightMiddleTip = rightHand[12];

        // 获取食指根部和小指根部（用于计算手掌平面法向量）
        const leftIndexMCP = leftHand[5];
        const leftPinkyMCP = leftHand[17];
        const rightIndexMCP = rightHand[5];
        const rightPinkyMCP = rightHand[17];

        // 1. 计算双手距离（手腕之间的距离）
        const handsDistance = this.distance(leftWrist, rightWrist);

        // 计算手的大小作为参考（手腕到中指尖的距离）
        const leftHandSize = this.distance(leftWrist, leftMiddleTip);
        const rightHandSize = this.distance(rightWrist, rightMiddleTip);
        const avgHandSize = (leftHandSize + rightHandSize) / 2;

        // 双手距离应该较近（小于1.5倍手大小）
        const isCloseEnough = handsDistance < avgHandSize * 1.5;

        // 2. 判断指尖朝上（手腕到中指的向量y分量为负，因为y轴向下）
        const leftHandUp = leftWrist.y > leftMiddleTip.y;
        const rightHandUp = rightWrist.y > rightMiddleTip.y;
        const fingersPointingUp = leftHandUp && rightHandUp;

        // 3. 计算手掌法向量（通过手腕、食指根部、小指根部）
        const leftNormal = this.getNormalVector(leftWrist, leftIndexMCP, leftPinkyMCP);
        const rightNormal = this.getNormalVector(rightWrist, rightIndexMCP, rightPinkyMCP);

        // 4. 判断掌心相对（法向量夹角接近180度，即点积接近-1）
        const normalDot = leftNormal.x * rightNormal.x +
                          leftNormal.y * rightNormal.y +
                          leftNormal.z * rightNormal.z;
        const palmsFacingEachOther = normalDot < -0.3; // 夹角大于约107度

        // 5. 双手都应该处于张开状态（至少4指伸展）
        const leftExtended = this.countExtendedFingers(leftHand);
        const rightExtended = this.countExtendedFingers(rightHand);
        const handsOpen = leftExtended >= 4 && rightExtended >= 4;

        // 综合判断
        const isPrayer = isCloseEnough && fingersPointingUp && palmsFacingEachOther && handsOpen;

        // 更新合十保持计时
        const now = Date.now();
        if (isPrayer) {
            if (!this.prayerHoldStart) {
                this.prayerHoldStart = now;
            }

            const holdDuration = now - this.prayerHoldStart;

            // 触发净化特效
            if (holdDuration >= this.prayerHoldTime && !this.prayerTriggered) {
                this.prayerTriggered = true;
                if (this.onPrayerGestureCallback) {
                    this.onPrayerGestureCallback();
                }
                return true;
            }
        } else {
            this.prayerHoldStart = null;
            this.prayerTriggered = false;
        }

        return false;
    }

    /**
     * 计算伸展的手指数量
     */
    countExtendedFingers(landmarks) {
        let count = 0;
        // 拇指
        if (this.isFingerExtended(landmarks, 4, 3, 2)) count++;
        // 食指
        if (this.isFingerExtended(landmarks, 8, 6, 5)) count++;
        // 中指
        if (this.isFingerExtended(landmarks, 12, 10, 9)) count++;
        // 无名指
        if (this.isFingerExtended(landmarks, 16, 14, 13)) count++;
        // 小指
        if (this.isFingerExtended(landmarks, 20, 18, 17)) count++;
        return count;
    }

    /**
     * 获取合十手势保持进度 (0-1)
     */
    getPrayerHoldProgress() {
        if (!this.prayerHoldStart) return 0;
        const elapsed = Date.now() - this.prayerHoldStart;
        return Math.min(elapsed / this.prayerHoldTime, 1);
    }

    /**
     * 设置双手合十检测回调
     */
    onPrayerGesture(callback) {
        this.onPrayerGestureCallback = callback;
    }

    recognize(landmarks) {
        if (!landmarks || landmarks.length !== 21) {
            this.currentGesture = this.GESTURES.NONE;
            this.confidence = 0;
            this.resetHoldTimer();
            return this.getResult();
        }

        this.updateFingerStates(landmarks);

        const [thumb, index, middle, ring, pinky] = this.fingerStates;
        const extendedCount = this.fingerStates.filter(Boolean).length;

        let detectedGesture = this.GESTURES.NONE;
        let conf = 0.9;

        // ========== 多指手势优先检测 ==========
        
        // 优先级1: 张开手掌（4指以上伸展）- 用于触发符箓环绕
        if (extendedCount >= 4) {
            detectedGesture = this.GESTURES.OPEN_PALM;
            conf = extendedCount / 5;
        }
        // 优先级2: 捏合手势（用于符箓环绕选择）
        else if (this.isPinchGesture(landmarks)) {
            detectedGesture = this.GESTURES.PINCH;
        }
        // 优先级3: OK手势（拇指食指圈起，其他伸展）
        else if (this.isOKGesture(landmarks)) {
            detectedGesture = this.GESTURES.OK;
        }
        // 优先级4: 三指（食指+中指+无名指伸展）
        else if (index && middle && ring && !pinky && !thumb) {
            detectedGesture = this.GESTURES.THREE;
        }
        // 优先级5: 比耶（食指+中指伸展，无名指小指弯曲）
        else if (index && middle && !ring && !pinky) {
            detectedGesture = this.GESTURES.PEACE;
            conf = thumb ? 0.85 : 0.95;
        }
        // 优先级6: 摇滚（拇指+食指+小指，中指无名指弯曲）
        else if (thumb && index && pinky && !middle && !ring) {
            detectedGesture = this.GESTURES.ROCK;
        }
        // 优先级7: 比6（拇指+小指伸展）
        else if (thumb && pinky && !index && !middle && !ring) {
            detectedGesture = this.GESTURES.SIX;
        }
        else if (pinky && !index && !middle && !ring && this.isSixGestureBackup(landmarks)) {
            detectedGesture = this.GESTURES.SIX;
            conf = 0.75;
        }
        // 优先级8: 点赞（仅拇指伸展）
        else if (thumb && !index && !middle && !ring && !pinky) {
            detectedGesture = this.GESTURES.THUMBS_UP;
        }
        // 优先级9: 握拳（所有手指弯曲）
        else if (extendedCount <= 1 && !index && !pinky) {
            detectedGesture = this.GESTURES.FIST;
            conf = (5 - extendedCount) / 5;
        }
        
        // ========== 单指手势最后检测（画符用）==========
        
        // 优先级10: 单指画符（仅食指伸展，其他手指弯曲）
        // 严格条件：食指伸展 + 中指/无名指/小指都不伸展
        else if (index && !middle && !ring && !pinky) {
            detectedGesture = this.GESTURES.POINTING;
            conf = 0.95;
        }

        // 招手检测优先覆盖（运动型手势，独立于静态姿态）
        if (this.detectWave(landmarks)) {
            this.waveDetected = true;
        }

        if (this.waveDetected) {
            detectedGesture = this.GESTURES.WAVE;
            conf = 0.95;
            this.waveDetected = false;
        }

        // 手势稳定性过滤：使用滑动窗口减少抖动
        detectedGesture = this.stabilizeGesture(detectedGesture);

        this.currentGesture = detectedGesture;
        this.confidence = conf;

        this.updateHoldTimer(detectedGesture);

        return this.getResult();
    }

    /**
     * 手势稳定性过滤
     */
    stabilizeGesture(gesture) {
        if (!this.gestureHistory) {
            this.gestureHistory = [];
            this.stableGesture = this.GESTURES.NONE;
        }
        
        this.gestureHistory.push(gesture);
        
        // 保留最近5帧
        if (this.gestureHistory.length > 5) {
            this.gestureHistory.shift();
        }
        
        // 统计最近帧中最频繁的手势
        const counts = {};
        for (const g of this.gestureHistory) {
            counts[g] = (counts[g] || 0) + 1;
        }
        
        let maxCount = 0;
        let mostFrequent = this.GESTURES.NONE;
        for (const [g, count] of Object.entries(counts)) {
            if (count > maxCount) {
                maxCount = count;
                mostFrequent = g;
            }
        }
        
        // 需要至少3帧一致才切换手势（减少抖动）
        if (maxCount >= 3) {
            this.stableGesture = mostFrequent;
        }
        
        return this.stableGesture;
    }

    /**
     * 更新手势保持计时
     */
    updateHoldTimer(gesture) {
        // 如果手势变化，重置计时器
        if (gesture !== this.lastGesture) {
            this.lastGesture = gesture;
            this.gestureHoldStart = Date.now();
            this.gestureTriggered = false;
            return;
        }

        if (gesture !== this.GESTURES.NONE && 
            gesture !== this.GESTURES.POINTING &&
            gesture !== this.GESTURES.OPEN_PALM &&
            gesture !== this.GESTURES.PINCH &&
            gesture !== this.GESTURES.WAVE &&
            !this.gestureTriggered &&
            this.gestureHoldStart) {
            
            const holdTime = Date.now() - this.gestureHoldStart;
            
            if (holdTime >= this.thresholds.holdTime) {
                this.gestureTriggered = true;
                
                // 触发回调
                const talisman = this.GESTURE_TALISMAN_MAP[gesture];
                if (talisman && this.onGestureTriggerCallback) {
                    this.onGestureTriggerCallback(gesture, talisman);
                }
            }
        }
    }

    /**
     * 重置保持计时器
     */
    resetHoldTimer() {
        this.gestureHoldStart = null;
        this.lastGesture = this.GESTURES.NONE;
        this.gestureTriggered = false;
    }

    /**
     * 获取手势保持进度 (0-1)
     */
    getHoldProgress() {
        if (!this.gestureHoldStart || 
            this.currentGesture === this.GESTURES.NONE ||
            this.currentGesture === this.GESTURES.POINTING) {
            return 0;
        }
        
        const elapsed = Date.now() - this.gestureHoldStart;
        return Math.min(elapsed / this.thresholds.holdTime, 1);
    }

    /**
     * 设置手势触发回调
     */
    onGestureTrigger(callback) {
        this.onGestureTriggerCallback = callback;
    }

    /**
     * 获取识别结果
     */
    getResult() {
        return {
            gesture: this.currentGesture,
            confidence: this.confidence,
            fingerStates: [...this.fingerStates],
            holdProgress: this.getHoldProgress(),
            isTriggered: this.gestureTriggered
        };
    }

    /**
     * 获取手势显示名称
     */
    getGestureName(gesture) {
        const names = {
            [this.GESTURES.NONE]: '无',
            [this.GESTURES.OPEN_PALM]: '🖐️ 五指张开',
            [this.GESTURES.FIST]: '✊ 握拳',
            [this.GESTURES.POINTING]: '👆 单指',
            [this.GESTURES.PEACE]: '✌️ 比耶',
            [this.GESTURES.SIX]: '🤙 比6',
            [this.GESTURES.ROCK]: '🤟 摇滚',
            [this.GESTURES.OK]: '👌 OK',
            [this.GESTURES.THREE]: '🌿 三指',
            [this.GESTURES.PINCH]: '🤏 捏合',
            [this.GESTURES.THUMBS_UP]: '👍 点赞',
            [this.GESTURES.WAVE]: '👋 招手'
        };
        return names[gesture] || '未知';
    }

    /**
     * 获取对应的符箓信息
     */
    getTalismanForGesture(gesture) {
        return this.GESTURE_TALISMAN_MAP[gesture] || null;
    }

    /**
     * 获取手指状态字符串
     */
    getFingerStateString() {
        return this.fingerStates.map(s => s ? '👆' : '👇').join('');
    }
}

// 导出
window.GestureRecognizer = GestureRecognizer;
