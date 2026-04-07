/**
 * 通天箓 - 符文图案匹配模块
 * 使用 $1 Recognizer 变体算法进行几何图案识别
 */

class PatternMatcher {
    constructor() {
        // 符箓模板
        this.templates = this.initTemplates();
        
        // 采样点数
        this.numPoints = 64;
        
        // 识别阈值（基础）- 手指画符不精准，阈值要低
        this.threshold = 0.40;
        
        // 各图案的个性化阈值（手绘容错）
        this.thresholdOverrides = {
            fire: 0.38,      // 三角形
            earth: 0.35,     // 正方形
            ice: 0.35,       // 六边形
            water: 0.38,     // 波浪线
            wood: 0.35,      // Y形
            metal: 0.35,     // 闪电
            thunder: 0.32,   // 双折线
            wind: 0.32       // 螺旋
        };
    }

    /**
     * 初始化符箓模板
     * @returns {Object}
     */
    initTemplates() {
        return {
            // 火符：三角形向上
            fire: {
                name: '火符',
                element: 'fire',
                pattern: this.createTriangle('up'),
                symbol: '🔥'
            },
            // 水符：波浪线
            water: {
                name: '水符',
                element: 'water',
                pattern: this.createWave(),
                symbol: '💧'
            },
            // 木符：Y形向上
            wood: {
                name: '木符',
                element: 'wood',
                pattern: this.createY(),
                symbol: '🌿'
            },
            // 金符：闪电折线
            metal: {
                name: '金符',
                element: 'metal',
                pattern: this.createLightning(),
                symbol: '⚡'
            },
            // 土符：正方形
            earth: {
                name: '土符',
                element: 'earth',
                pattern: this.createSquare(),
                symbol: '🌍'
            },
            // 冰符：六边形
            ice: {
                name: '冰符',
                element: 'ice',
                pattern: this.createHexagon(),
                symbol: '❄️'
            },
            // 雷符：双折线
            thunder: {
                name: '雷符',
                element: 'thunder',
                pattern: this.createDoubleLightning(),
                symbol: '💜'
            },
            // 风符：螺旋线
            wind: {
                name: '风符',
                element: 'wind',
                pattern: this.createSpiral(),
                symbol: '🌸'
            }
        };
    }

    /**
     * 创建三角形模板
     * @param {string} direction 方向 'up' 或 'down'
     * @returns {Array}
     */
    createTriangle(direction = 'up') {
        const points = [];
        const numSides = 3;
        const startAngle = direction === 'up' ? -Math.PI / 2 : Math.PI / 2;
        
        for (let i = 0; i <= numSides; i++) {
            const angle = startAngle + (i * 2 * Math.PI / numSides);
            points.push({
                x: 0.5 + 0.4 * Math.cos(angle),
                y: 0.5 + 0.4 * Math.sin(angle)
            });
        }
        
        return this.resample(points, this.numPoints);
    }

    /**
     * 创建波浪线模板
     * @returns {Array}
     */
    createWave() {
        const points = [];
        const waves = 2;
        
        for (let i = 0; i <= 50; i++) {
            const t = i / 50;
            points.push({
                x: 0.1 + t * 0.8,
                y: 0.5 + 0.2 * Math.sin(t * waves * 2 * Math.PI)
            });
        }
        
        return this.resample(points, this.numPoints);
    }

    /**
     * 创建Y形模板
     * @returns {Array}
     */
    createY() {
        const points = [];
        
        // 左上到中心
        for (let i = 0; i <= 20; i++) {
            const t = i / 20;
            points.push({
                x: 0.2 + t * 0.3,
                y: 0.2 + t * 0.3
            });
        }
        
        // 中心到右上
        for (let i = 0; i <= 20; i++) {
            const t = i / 20;
            points.push({
                x: 0.5 + t * 0.3,
                y: 0.5 - t * 0.3
            });
        }
        
        // 回到中心再到下
        for (let i = 0; i <= 20; i++) {
            const t = i / 20;
            points.push({
                x: 0.5,
                y: 0.5 + t * 0.35
            });
        }
        
        return this.resample(points, this.numPoints);
    }

    /**
     * 创建闪电折线模板
     * @returns {Array}
     */
    createLightning() {
        const points = [
            { x: 0.5, y: 0.1 },
            { x: 0.35, y: 0.4 },
            { x: 0.55, y: 0.45 },
            { x: 0.3, y: 0.9 }
        ];
        
        return this.resample(this.interpolatePath(points), this.numPoints);
    }

    /**
     * 创建正方形模板
     * @returns {Array}
     */
    createSquare() {
        const points = [
            { x: 0.25, y: 0.25 },
            { x: 0.75, y: 0.25 },
            { x: 0.75, y: 0.75 },
            { x: 0.25, y: 0.75 },
            { x: 0.25, y: 0.25 }
        ];
        
        return this.resample(this.interpolatePath(points), this.numPoints);
    }

    /**
     * 创建六边形模板
     * @returns {Array}
     */
    createHexagon() {
        const points = [];
        const numSides = 6;
        
        for (let i = 0; i <= numSides; i++) {
            const angle = -Math.PI / 2 + (i * 2 * Math.PI / numSides);
            points.push({
                x: 0.5 + 0.35 * Math.cos(angle),
                y: 0.5 + 0.35 * Math.sin(angle)
            });
        }
        
        return this.resample(this.interpolatePath(points), this.numPoints);
    }

    /**
     * 创建双闪电模板
     * @returns {Array}
     */
    createDoubleLightning() {
        const points = [
            { x: 0.3, y: 0.1 },
            { x: 0.2, y: 0.35 },
            { x: 0.35, y: 0.4 },
            { x: 0.15, y: 0.65 },
            { x: 0.4, y: 0.5 },
            { x: 0.55, y: 0.55 },
            { x: 0.45, y: 0.9 }
        ];
        
        return this.resample(this.interpolatePath(points), this.numPoints);
    }

    /**
     * 创建螺旋线模板
     * @returns {Array}
     */
    createSpiral() {
        const points = [];
        const turns = 1.5;
        const numPoints = 60;
        
        for (let i = 0; i <= numPoints; i++) {
            const t = i / numPoints;
            const angle = t * turns * 2 * Math.PI;
            const radius = 0.1 + t * 0.3;
            
            points.push({
                x: 0.5 + radius * Math.cos(angle),
                y: 0.5 + radius * Math.sin(angle)
            });
        }
        
        return this.resample(points, this.numPoints);
    }

    /**
     * 插值路径以增加点密度
     * @param {Array} points 
     * @returns {Array}
     */
    interpolatePath(points) {
        const result = [];
        
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            
            for (let t = 0; t < 1; t += 0.05) {
                result.push({
                    x: p1.x + t * (p2.x - p1.x),
                    y: p1.y + t * (p2.y - p1.y)
                });
            }
        }
        
        result.push(points[points.length - 1]);
        return result;
    }

    /**
     * 重采样为固定点数
     * @param {Array} points 
     * @param {number} n 目标点数
     * @returns {Array}
     */
    resample(points, n) {
        if (points.length === 0) return [];
        
        const I = this.pathLength(points) / (n - 1);
        let D = 0;
        const newPoints = [points[0]];
        
        for (let i = 1; i < points.length; i++) {
            const d = this.distance(points[i - 1], points[i]);
            
            if (D + d >= I) {
                const qx = points[i - 1].x + ((I - D) / d) * (points[i].x - points[i - 1].x);
                const qy = points[i - 1].y + ((I - D) / d) * (points[i].y - points[i - 1].y);
                const q = { x: qx, y: qy };
                newPoints.push(q);
                points.splice(i, 0, q);
                D = 0;
            } else {
                D += d;
            }
        }
        
        // 确保点数正确
        while (newPoints.length < n) {
            newPoints.push(points[points.length - 1]);
        }
        
        return newPoints.slice(0, n);
    }

    /**
     * 计算路径长度
     * @param {Array} points 
     * @returns {number}
     */
    pathLength(points) {
        let length = 0;
        for (let i = 1; i < points.length; i++) {
            length += this.distance(points[i - 1], points[i]);
        }
        return length;
    }

    /**
     * 计算两点距离
     * @param {Object} p1 
     * @param {Object} p2 
     * @returns {number}
     */
    distance(p1, p2) {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * 归一化点集（缩放+平移到单位正方形）
     * @param {Array} points 
     * @returns {Array}
     */
    normalize(points) {
        if (points.length === 0) return [];
        
        // 找边界
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        points.forEach(p => {
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y);
        });
        
        const width = maxX - minX || 1;
        const height = maxY - minY || 1;
        const scale = Math.max(width, height);
        
        // 归一化到 0-1
        return points.map(p => ({
            x: (p.x - minX) / scale,
            y: (p.y - minY) / scale
        }));
    }

    /**
     * 计算两个点集的相似度（使用最近点距离）
     * @param {Array} points1 
     * @param {Array} points2 
     * @returns {number} 0-1, 越大越相似
     */
    similarity(points1, points2) {
        if (points1.length !== points2.length) return 0;
        
        let totalDist = 0;
        
        for (let i = 0; i < points1.length; i++) {
            totalDist += this.distance(points1[i], points2[i]);
        }
        
        const avgDist = totalDist / points1.length;
        
        // 转换为相似度 - 非常宽容，手指画符误差大
        return Math.exp(-avgDist * 2.5);
    }

    /**
     * 使用 Hausdorff 距离的变体计算相似度（对顺序不敏感）
     * 手指画符最适合用这个方法
     * @param {Array} points1 
     * @param {Array} points2 
     * @returns {number}
     */
    shapeSimilarity(points1, points2) {
        let sumMinDist = 0;
        
        for (const p1 of points1) {
            let minDist = Infinity;
            for (const p2 of points2) {
                const d = this.distance(p1, p2);
                if (d < minDist) minDist = d;
            }
            sumMinDist += minDist;
        }
        
        const avgMinDist = sumMinDist / points1.length;
        return Math.exp(-avgMinDist * 3);
    }

    /**
     * 循环移位点集（用于闭合图形的不同起点匹配）
     * @param {Array} points 
     * @param {number} shift 移位量
     * @returns {Array}
     */
    cyclicShift(points, shift) {
        const n = points.length;
        const result = [];
        for (let i = 0; i < n; i++) {
            result.push(points[(i + shift) % n]);
        }
        return result;
    }

    /**
     * 匹配符文图案
     * @param {Array} inputPoints 输入的轨迹点
     * @returns {Object|null} 匹配结果
     */
    match(inputPoints) {
        if (!inputPoints || inputPoints.length < 5) {
            console.log(`[PatternMatcher] 点数不足: ${inputPoints?.length || 0}`);
            return null;
        }

        // 预处理输入
        const resampled = this.resample(inputPoints, this.numPoints);
        const normalized = this.normalize(resampled);

        let bestMatch = null;
        let bestScore = 0;
        let allScores = [];

        // 与每个模板比较
        for (const [key, template] of Object.entries(this.templates)) {
            const templateNorm = this.normalize(template.pattern);
            let scores = [];
            
            // 形状相似度（不依赖顺序和起点，最适合手绘）
            scores.push(this.shapeSimilarity(normalized, templateNorm));
            
            // 正向匹配
            scores.push(this.similarity(normalized, templateNorm));
            
            // 反向匹配（处理反方向画的情况）
            const reversed = [...normalized].reverse();
            scores.push(this.similarity(reversed, templateNorm));
            
            // 旋转匹配（处理不同角度）
            for (let angle = 0; angle < 360; angle += 45) {
                const rotated = this.rotatePoints(normalized, angle * Math.PI / 180);
                scores.push(this.similarity(rotated, templateNorm));
            }

            // 循环移位匹配（不同起点）- 对所有图形都尝试
            const shiftAmounts = [
                Math.floor(this.numPoints * 0.25),
                Math.floor(this.numPoints * 0.5),
                Math.floor(this.numPoints * 0.75)
            ];
            
            for (const shift of shiftAmounts) {
                const shifted = this.cyclicShift(normalized, shift);
                scores.push(this.similarity(shifted, templateNorm));
                scores.push(this.similarity(this.cyclicShift(reversed, shift), templateNorm));
            }
            
            const score = Math.max(...scores);
            
            allScores.push({ key, name: template.name, score });

            if (score > bestScore) {
                bestScore = score;
                bestMatch = {
                    key: key,
                    ...template,
                    score: score
                };
            }
        }

        // 使用个性化阈值检查
        if (bestMatch) {
            const requiredThreshold = this.thresholdOverrides[bestMatch.key] || this.threshold;
            
            if (bestScore >= requiredThreshold) {
                console.log(`[PatternMatcher] 识别成功: ${bestMatch.name}, 置信度: ${(bestScore * 100).toFixed(1)}% (阈值: ${(requiredThreshold * 100).toFixed(0)}%)`);
                return bestMatch;
            }
        }

        // 调试输出前3名
        allScores.sort((a, b) => b.score - a.score);
        console.log(`[PatternMatcher] 未识别, 候选: ${allScores.slice(0, 3).map(s => `${s.name}:${(s.score * 100).toFixed(0)}%`).join(', ')}`);
        return null;
    }

    /**
     * 旋转点集
     */
    rotatePoints(points, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const cx = 0.5, cy = 0.5;
        
        return points.map(p => ({
            x: cx + (p.x - cx) * cos - (p.y - cy) * sin,
            y: cy + (p.x - cx) * sin + (p.y - cy) * cos
        }));
    }

    /**
     * 获取所有符箓信息
     * @returns {Array}
     */
    getAllTalismans() {
        return Object.entries(this.templates).map(([key, t]) => ({
            key,
            name: t.name,
            element: t.element,
            symbol: t.symbol
        }));
    }
}

// 导出
window.PatternMatcher = PatternMatcher;
