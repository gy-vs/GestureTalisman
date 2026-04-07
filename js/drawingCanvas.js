/**
 * 通天箓 - 画符画布模块
 * 处理画符轨迹的渲染和记录
 */

class DrawingCanvas {
    constructor() {
        this.canvas = document.getElementById('drawingCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 轨迹数据
        this.points = [];
        this.isDrawing = false;
        this.lastPoint = null;
        
        // EMA 平滑参数 (增大 alpha 保留更多原始轨迹细节)
        this.smoothAlpha = 0.6;
        this.lastSmoothX = null;
        this.lastSmoothY = null;
        this.interpolateThreshold = 0.05;
        
        // 渲染配置
        this.config = {
            strokeColor: '#FFD700',
            strokeWidth: 4,
            glowColor: 'rgba(255, 215, 0, 0.6)',
            glowSize: 15,
            trailLength: 500,         // 增加到500，保留更多轨迹点
            trailFadeSpeed: 0.985,    // 降低衰减速度，粒子保留更久
            sparkleChance: 0.08,
            maxTrailParticles: 300    // 增加粒子上限
        };

        // 粒子轨迹
        this.trails = [];
        
        // 初始化尺寸
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    /**
     * 调整画布尺寸
     */
    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.width = rect.width;
        this.height = rect.height;
    }

    /**
     * 开始画符（摄像头模式，需要镜像）
     * @param {number} x 归一化坐标 (0-1)
     * @param {number} y 归一化坐标 (0-1)
     */
    startDrawing(x, y) {
        this.isDrawing = true;
        this.points = [];
        this.lastSmoothX = null;
        this.lastSmoothY = null;
        this.addPoint(x, y);
    }

    startDrawingDirect(x, y) {
        this.isDrawing = true;
        this.points = [];
        this.lastSmoothX = null;
        this.lastSmoothY = null;
        this.addPointDirect(x, y);
    }

    /**
     * EMA 平滑 + 线性插值
     */
    _smoothAndPush(normX, normY) {
        if (this.lastSmoothX === null) {
            this.lastSmoothX = normX;
            this.lastSmoothY = normY;
        } else {
            this.lastSmoothX = this.smoothAlpha * normX + (1 - this.smoothAlpha) * this.lastSmoothX;
            this.lastSmoothY = this.smoothAlpha * normY + (1 - this.smoothAlpha) * this.lastSmoothY;
        }

        const sx = this.lastSmoothX;
        const sy = this.lastSmoothY;
        const screenX = sx * this.width;
        const screenY = sy * this.height;

        if (this.lastPoint) {
            const dx = sx - this.lastPoint.normalizedX;
            const dy = sy - this.lastPoint.normalizedY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > this.interpolateThreshold) {
                const steps = Math.ceil(dist / this.interpolateThreshold);
                for (let i = 1; i < steps; i++) {
                    const t = i / steps;
                    const ix = this.lastPoint.normalizedX + dx * t;
                    const iy = this.lastPoint.normalizedY + dy * t;
                    this.points.push({
                        x: ix * this.width, y: iy * this.height,
                        time: Date.now(), normalizedX: ix, normalizedY: iy
                    });
                    this.addTrailParticle(ix * this.width, iy * this.height);
                }
            }
        }

        const point = { x: screenX, y: screenY, time: Date.now(), normalizedX: sx, normalizedY: sy };
        this.points.push(point);
        this.addTrailParticle(screenX, screenY);
        this.lastPoint = point;
    }

    addPoint(x, y) {
        if (!this.isDrawing) return;
        this._smoothAndPush(1 - x, y);
    }

    addPointDirect(x, y) {
        if (!this.isDrawing) return;
        this._smoothAndPush(x, y);
    }

    /**
     * 添加轨迹粒子
     * @param {number} x 
     * @param {number} y 
     */
    addTrailParticle(x, y) {
        this.trails.push({
            x: x,
            y: y,
            size: this.config.strokeWidth + Math.random() * 2,
            alpha: 1,
            sparkle: Math.random() < this.config.sparkleChance
        });

        // 限制粒子数量
        const maxParticles = this.config.maxTrailParticles || 300;
        if (this.trails.length > maxParticles) {
            this.trails.shift();
        }
    }

    /**
     * 停止画符
     * @returns {Array} 归一化的轨迹点数组
     */
    stopDrawing() {
        this.isDrawing = false;
        const normalizedPoints = this.points.map(p => ({
            x: p.normalizedX,
            y: p.normalizedY
        }));
        return normalizedPoints;
    }

    /**
     * 获取当前轨迹点
     * @returns {Array}
     */
    getPoints() {
        return this.points.map(p => ({
            x: p.normalizedX,
            y: p.normalizedY
        }));
    }

    /**
     * 清除画布
     */
    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.points = [];
        this.trails = [];
        this.isDrawing = false;
    }

    /**
     * 渲染帧
     */
    render() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // 渲染轨迹粒子（带光晕）
        this.renderTrails();

        // 渲染主轨迹线
        if (this.points.length >= 2) {
            this.renderMainStroke();
        }

        // 更新粒子状态
        this.updateTrails();
    }

    /**
     * 渲染轨迹粒子
     */
    renderTrails() {
        this.trails.forEach((trail, index) => {
            const alpha = trail.alpha;
            
            // 外发光
            this.ctx.beginPath();
            const gradient = this.ctx.createRadialGradient(
                trail.x, trail.y, 0,
                trail.x, trail.y, trail.size * 3
            );
            gradient.addColorStop(0, `rgba(255, 215, 0, ${alpha * 0.8})`);
            gradient.addColorStop(0.5, `rgba(255, 215, 0, ${alpha * 0.3})`);
            gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.arc(trail.x, trail.y, trail.size * 3, 0, Math.PI * 2);
            this.ctx.fill();

            // 核心点
            this.ctx.beginPath();
            this.ctx.fillStyle = `rgba(255, 250, 205, ${alpha})`;
            this.ctx.arc(trail.x, trail.y, trail.size * 0.5, 0, Math.PI * 2);
            this.ctx.fill();

            // 闪烁效果
            if (trail.sparkle && alpha > 0.5) {
                this.renderSparkle(trail.x, trail.y, trail.size * 2, alpha);
            }
        });
    }

    /**
     * 渲染星芒闪烁
     * @param {number} x 
     * @param {number} y 
     * @param {number} size 
     * @param {number} alpha 
     */
    renderSparkle(x, y, size, alpha) {
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(Math.random() * Math.PI);
        
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        this.ctx.lineWidth = 1;
        
        // 十字星芒
        for (let i = 0; i < 4; i++) {
            this.ctx.rotate(Math.PI / 4);
            this.ctx.beginPath();
            this.ctx.moveTo(0, -size);
            this.ctx.lineTo(0, size);
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }

    /**
     * 渲染主轨迹线（完整轨迹+渐变效果）
     */
    renderMainStroke() {
        if (this.points.length < 2) return;

        // 渲染完整的轨迹线（带渐变透明度）
        const totalPoints = this.points.length;
        const fadeStart = Math.max(0, totalPoints - 50); // 最近50个点完全不透明
        
        this.ctx.save();
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        // 分段渲染以实现渐变效果
        for (let i = 1; i < totalPoints; i++) {
            const p0 = this.points[i - 1];
            const p1 = this.points[i];
            
            // 计算透明度：越旧的点越透明，但保持最低30%透明度
            let alpha = 1;
            if (i < fadeStart) {
                alpha = 0.3 + 0.7 * (i / fadeStart);
            }
            
            // 线宽也随透明度略微变化
            const lineWidth = this.config.strokeWidth * (0.6 + 0.4 * alpha);
            
            this.ctx.beginPath();
            this.ctx.moveTo(p0.x, p0.y);
            this.ctx.lineTo(p1.x, p1.y);
            
            // 外发光
            this.ctx.shadowColor = `rgba(255, 215, 0, ${alpha * 0.6})`;
            this.ctx.shadowBlur = this.config.glowSize * alpha;
            
            this.ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
            this.ctx.lineWidth = lineWidth;
            this.ctx.stroke();
        }
        
        this.ctx.restore();

        // 在最新点位置绘制一个发光指示点
        if (totalPoints > 0) {
            const lastPoint = this.points[totalPoints - 1];
            this.ctx.beginPath();
            this.ctx.arc(lastPoint.x, lastPoint.y, this.config.strokeWidth * 1.5, 0, Math.PI * 2);
            this.ctx.fillStyle = '#FFFACD';
            this.ctx.shadowColor = '#FFD700';
            this.ctx.shadowBlur = 20;
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        }
    }

    /**
     * 更新轨迹粒子状态
     */
    updateTrails() {
        this.trails = this.trails.filter(trail => {
            trail.alpha *= this.config.trailFadeSpeed;
            trail.size *= 0.98;
            return trail.alpha > 0.05;
        });
    }

    /**
     * 播放成功动画
     */
    playSuccessAnimation() {
        // 将当前轨迹转化为上升粒子
        const particles = this.points.map(p => ({
            x: p.x,
            y: p.y,
            vx: (Math.random() - 0.5) * 2,
            vy: -2 - Math.random() * 3,
            size: 3 + Math.random() * 3,
            alpha: 1,
            color: Math.random() > 0.5 ? '#FFD700' : '#00D4FF'
        }));

        const animate = () => {
            this.ctx.clearRect(0, 0, this.width, this.height);
            
            let alive = false;
            
            particles.forEach(p => {
                if (p.alpha <= 0) return;
                
                alive = true;
                
                // 更新位置
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.05; // 轻微重力
                p.alpha -= 0.02;
                
                // 绘制
                this.ctx.beginPath();
                this.ctx.fillStyle = p.color.replace(')', `, ${p.alpha})`).replace('rgb', 'rgba').replace('#FFD700', 'rgba(255, 215, 0').replace('#00D4FF', 'rgba(0, 212, 255');
                
                // 简化颜色处理
                if (p.color === '#FFD700') {
                    this.ctx.fillStyle = `rgba(255, 215, 0, ${p.alpha})`;
                } else {
                    this.ctx.fillStyle = `rgba(0, 212, 255, ${p.alpha})`;
                }
                
                this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                this.ctx.fill();
            });

            if (alive) {
                requestAnimationFrame(animate);
            } else {
                this.clear();
            }
        };

        animate();
    }

    /**
     * 检查是否在画符
     * @returns {boolean}
     */
    isCurrentlyDrawing() {
        return this.isDrawing;
    }
}

// 导出
window.DrawingCanvas = DrawingCanvas;
