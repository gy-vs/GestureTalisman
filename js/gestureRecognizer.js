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
            WAVE: 'wave',
            PRAYER: 'prayer'
        };

        this.GESTURE_TALISMAN_MAP = {
            [this.GESTURES.PEACE]: { element: 'fire', name: '火符', symbol: '🔥' },
            [this.GESTURES.SIX]: { element: 'ice', name: '冰符', symbol: '❄️' },
            [this.GESTURES.OK]: { element: 'water', name: '水符', symbol: '💧' },
            [this.GESTURES.ROCK]: { element: 'thunder', name: '雷符', symbol: '💜' },
            [this.GESTURES.THUMBS_UP]: { element: 'wind', name: '风符', symbol: '🌸' },
            [this.GESTURES.FIST]: { element: 'earth', name: '土符', symbol: '🌍' },
            [this.GESTURES.THREE]: { element: 'wood', name: '木符', symbol: '🌿' },
            [this.GESTURES.PRAYER]: { element: 'purify', name: '净化光柱', symbol: '✨' }
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

        // 招手检测：手腕 x 坐标历史
        this.wristHistory = [];
        this.waveDetected = false;
        this.waveCooldown = 0;
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
     * 专门检测单指指向手势（更宽松的条件）
     */
    isPointingGesture(landmarks) {
        if (!landmarks) return false;
        
        // 食指必须伸展
        const indexExtended = this.isFingerExtended(landmarks, 8, 6, 5);
        if (!indexExtended) return false;
        
        // 其他三指（中指、无名指、小指）应该弯曲
        const middleCurled = this.isFingerCurled(landmarks, 12, 10, 9);
        const ringCurled = this.isFingerCurled(landmarks, 16, 14, 13);
        const pinkyCurled = this.isFingerCurled(landmarks, 20, 18, 17);
        
        // 至少2个其他手指弯曲即可（宽松条件）
        const curledCount = [middleCurled, ringCurled, pinkyCurled].filter(Boolean).length;
        
        // 食指明显高于中指（额外验证）
        const indexTip = landmarks[8];
        const middleTip = landmarks[12];
        const indexHigher = indexTip.y < middleTip.y - 0.03;
        
        return curledCount >= 2 || (curledCount >= 1 && indexHigher);
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

    normalize(v) {
        const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        if (len === 0) return { x: 0, y: 0, z: 0 };
        return { x: v.x / len, y: v.y / len, z: v.z / len };
    }

    dot(v1, v2) {
        return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
    }

    computePalmNormal(hand) {
        const wrist = hand[0];
        const indexMcp = hand[5];
        const pinkyMcp = hand[17];
        
        const v1 = {
            x: indexMcp.x - wrist.x,
            y: indexMcp.y - wrist.y,
            z: (indexMcp.z || 0) - (wrist.z || 0)
        };
        const v2 = {
            x: pinkyMcp.x - wrist.x,
            y: pinkyMcp.y - wrist.y,
            z: (pinkyMcp.z || 0) - (wrist.z || 0)
        };
        
        const normal = {
            x: v1.y * v2.z - v1.z * v2.y,
            y: v1.z * v2.x - v1.x * v2.z,
            z: v1.x * v2.y - v1.y * v2.x
        };
        
        return this.normalize(normal);
    }

    isPrayerGesture(multiLandmarks) {
        if (!multiLandmarks || multiLandmarks.length !== 2) return false;
        
        const hand1 = multiLandmarks[0];
        const hand2 = multiLandmarks[1];
        
        if (hand1.length !== 21 || hand2.length !== 21) return false;
        
        const fingerTipIndices = [4, 8, 12, 16, 20];
        let avgTipDistance = 0;
        
        for (const idx of fingerTipIndices) {
            avgTipDistance += this.distance(hand1[idx], hand2[idx]);
        }
        avgTipDistance /= fingerTipIndices.length;
        
        const normal1 = this.computePalmNormal(hand1);
        const normal2 = this.computePalmNormal(hand2);
        const dotProduct = this.dot(normal1, normal2);
        const angleRad = Math.acos(Math.max(-1, Math.min(1, dotProduct)));
        const angleDeg = angleRad * 180 / Math.PI;
        
        const wristDistance = this.distance(hand1[0], hand2[0]);
        
        const distThreshold = 0.15;
        const angleThreshold = 45;
        const isCloseEnough = avgTipDistance < distThreshold && wristDistance < distThreshold * 1.5;
        const isFacingEachOther = Math.abs(angleDeg) > (180 - angleThreshold) || Math.abs(angleDeg) < angleThreshold;
        
        const result = isCloseEnough && isFacingEachOther;
        
        if (result) {
            console.log('[Prayer] 指尖距离:', avgTipDistance.toFixed(4), 
                        '掌心夹角:', angleDeg.toFixed(1) + '°',
                        '手腕距离:', wristDistance.toFixed(4));
        }
        
        return result;
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

    recognize(landmarks, multiLandmarks) {
        if (this.isPrayerGesture(multiLandmarks)) {
            this.currentGesture = this.GESTURES.PRAYER;
            this.confidence = 0.95;
            this.updateHoldTimer(this.GESTURES.PRAYER);
            return this.getResult();
        }

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
            [this.GESTURES.WAVE]: '👋 招手',
            [this.GESTURES.PRAYER]: '🙏 双手合十'
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
