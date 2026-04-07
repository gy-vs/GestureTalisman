/**
 * 通天箓 - 摄像头管理模块
 * 负责摄像头的初始化、获取和释放
 */

class CameraManager {
    constructor() {
        this.video = document.getElementById('videoInput');
        this.stream = null;
        this.isActive = false;
        this.onFrameCallback = null;
        this.frameId = null;
    }

    /**
     * 初始化摄像头
     * @returns {Promise<boolean>} 是否成功
     */
    async init() {
        try {
            const constraints = {
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user',
                    frameRate: { ideal: 30 }
                },
                audio: false
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.stream;
            
            return new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.video.play();
                    this.isActive = true;
                    console.log('[Camera] 摄像头已启动', {
                        width: this.video.videoWidth,
                        height: this.video.videoHeight
                    });
                    resolve(true);
                };
            });
        } catch (error) {
            console.error('[Camera] 摄像头初始化失败:', error);
            this.handleError(error);
            return false;
        }
    }

    /**
     * 处理摄像头错误
     * @param {Error} error 
     */
    handleError(error) {
        let message = '无法访问摄像头';
        
        if (error.name === 'NotAllowedError') {
            message = '请允许浏览器访问摄像头权限';
        } else if (error.name === 'NotFoundError') {
            message = '未检测到摄像头设备';
        } else if (error.name === 'NotReadableError') {
            message = '摄像头被其他程序占用';
        } else if (error.name === 'OverconstrainedError') {
            message = '摄像头不支持请求的分辨率';
        }

        // 更新UI提示
        const promptTitle = document.querySelector('.camera-prompt__title');
        const promptDesc = document.querySelector('.camera-prompt__desc');
        if (promptTitle) promptTitle.textContent = '摄像头错误';
        if (promptDesc) promptDesc.textContent = message;
    }

    /**
     * 获取视频尺寸
     * @returns {{width: number, height: number}}
     */
    getVideoDimensions() {
        return {
            width: this.video.videoWidth || 1280,
            height: this.video.videoHeight || 720
        };
    }

    /**
     * 设置帧回调
     * @param {Function} callback 每帧回调函数
     */
    setFrameCallback(callback) {
        this.onFrameCallback = callback;
    }

    /**
     * 开始帧循环
     */
    startFrameLoop() {
        if (!this.isActive) return;
        
        const loop = () => {
            if (this.isActive && this.onFrameCallback) {
                this.onFrameCallback(this.video);
            }
            this.frameId = requestAnimationFrame(loop);
        };
        
        loop();
    }

    /**
     * 停止帧循环
     */
    stopFrameLoop() {
        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }
    }

    /**
     * 获取视频元素
     * @returns {HTMLVideoElement}
     */
    getVideoElement() {
        return this.video;
    }

    /**
     * 停止摄像头
     */
    stop() {
        this.stopFrameLoop();
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        this.video.srcObject = null;
        this.isActive = false;
        console.log('[Camera] 摄像头已停止');
    }

    /**
     * 检查是否激活
     * @returns {boolean}
     */
    isRunning() {
        return this.isActive;
    }
}

// 导出单例
window.CameraManager = CameraManager;
