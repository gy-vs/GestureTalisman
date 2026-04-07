/**
 * 通天箓 - 符箓系统模块
 * 管理符箓的展示、选择和激活
 */

class TalismanSystem {
    constructor() {
        this.container = document.getElementById('talismanRing');
        this.zoomContainer = document.getElementById('talismanZoom');
        this.zoomSymbol = document.getElementById('zoomSymbol');
        this.zoomName = document.getElementById('zoomName');
        
        // 符箓数据
        this.talismans = [
            { key: 'fire', name: '火符', symbol: '🔥', element: 'fire' },
            { key: 'water', name: '水符', symbol: '💧', element: 'water' },
            { key: 'wood', name: '木符', symbol: '🌿', element: 'wood' },
            { key: 'metal', name: '金符', symbol: '⚡', element: 'metal' },
            { key: 'earth', name: '土符', symbol: '🌍', element: 'earth' },
            { key: 'ice', name: '冰符', symbol: '❄️', element: 'ice' },
            { key: 'thunder', name: '雷符', symbol: '💜', element: 'thunder' },
            { key: 'wind', name: '风符', symbol: '🌸', element: 'wind' }
        ];
        
        // 状态
        this.isVisible = false;
        this.selectedIndex = -1;
        this.hoveredIndex = -1;
        this.pickedTalisman = null;
        
        // 卡片元素
        this.cards = [];
        
        // 回调
        this.onActivateCallback = null;
        this.onPickCallback = null;
        
        // 初始化
        this.initCards();
    }

    /**
     * 初始化符箓卡片
     */
    initCards() {
        this.container.innerHTML = '';
        
        this.talismans.forEach((talisman, index) => {
            const card = document.createElement('div');
            card.className = 'talisman-card idle';
            card.dataset.element = talisman.element;
            card.dataset.index = index;
            
            card.innerHTML = `
                <div class="talisman-card__symbol">${talisman.symbol}</div>
                <div class="talisman-card__name">${talisman.name}</div>
            `;
            
            // 鼠标交互（模拟模式用）
            card.addEventListener('mouseenter', () => this.hoverCard(index));
            card.addEventListener('mouseleave', () => this.unhoverCard(index));
            card.addEventListener('click', () => this.selectCard(index));
            
            this.container.appendChild(card);
            this.cards.push(card);
        });
    }

    /**
     * 显示符箓环绕
     */
    show() {
        if (this.isVisible) return;
        
        this.isVisible = true;
        this.container.classList.remove('hidden');
        this.container.classList.add('appearing');
        
        // 移除appearing类，保持显示状态
        setTimeout(() => {
            this.container.classList.remove('appearing');
            this.container.classList.add('active');
        }, 500);
        
        console.log('[TalismanSystem] 符箓环绕已显示');
    }

    /**
     * 隐藏符箓环绕
     * @param {boolean} scatter 是否播放飘散动画
     */
    hide(scatter = false) {
        if (!this.isVisible) return;
        
        if (scatter) {
            this.container.classList.add('scattering');
            setTimeout(() => {
                this.container.classList.remove('scattering', 'active');
                this.container.classList.add('hidden');
                this.isVisible = false;
            }, 600);
        } else {
            this.container.classList.remove('active');
            this.container.classList.add('hidden');
            this.isVisible = false;
        }
        
        this.selectedIndex = -1;
        this.hoveredIndex = -1;
        this.resetCardStates();
        
        console.log('[TalismanSystem] 符箓环绕已隐藏');
    }

    /**
     * 悬停卡片
     * @param {number} index 
     */
    hoverCard(index) {
        if (!this.isVisible || this.pickedTalisman) return;
        
        this.hoveredIndex = index;
        this.updateCardStates();
    }

    /**
     * 取消悬停
     * @param {number} index 
     */
    unhoverCard(index) {
        if (this.hoveredIndex === index) {
            this.hoveredIndex = -1;
            this.updateCardStates();
        }
    }

    /**
     * 选择卡片
     * @param {number} index 
     */
    selectCard(index) {
        if (!this.isVisible) return;
        
        this.selectedIndex = index;
        this.hoveredIndex = index;
        this.updateCardStates();
        
        const picked = this.pickSelected();
        if (picked && this.onPickCallback) {
            this.onPickCallback(picked);
        }
    }

    /**
     * 通过指尖位置检测悬停的符箓（摄像头模式，需要镜像）
     * @param {number} x 归一化x坐标 (0-1)
     * @param {number} y 归一化y坐标 (0-1)
     */
    checkHoverByPosition(x, y) {
        if (!this.isVisible || this.pickedTalisman) return;
        
        // 镜像x坐标
        const mirroredX = 1 - x;
        
        // 将归一化坐标转换为屏幕坐标
        const screenX = mirroredX * window.innerWidth;
        const screenY = y * window.innerHeight;
        
        this._checkHoverAtScreen(screenX, screenY);
    }

    /**
     * 通过屏幕坐标检测悬停的符箓（模拟模式，不镜像）
     * @param {number} screenX 屏幕x坐标
     * @param {number} screenY 屏幕y坐标
     */
    checkHoverByScreenPosition(screenX, screenY) {
        if (!this.isVisible || this.pickedTalisman) return;
        
        this._checkHoverAtScreen(screenX, screenY);
    }

    /**
     * 内部方法：在屏幕坐标处检测悬停
     * @param {number} screenX 
     * @param {number} screenY 
     */
    _checkHoverAtScreen(screenX, screenY) {
        let foundIndex = -1;
        
        this.cards.forEach((card, index) => {
            const rect = card.getBoundingClientRect();
            
            if (screenX >= rect.left && screenX <= rect.right &&
                screenY >= rect.top && screenY <= rect.bottom) {
                foundIndex = index;
            }
        });
        
        if (foundIndex !== this.hoveredIndex) {
            this.hoveredIndex = foundIndex;
            this.updateCardStates();
        }
    }

    /**
     * 更新卡片状态
     */
    updateCardStates() {
        this.cards.forEach((card, index) => {
            card.classList.remove('idle', 'hover', 'selected');
            
            if (index === this.selectedIndex) {
                card.classList.add('selected');
            } else if (index === this.hoveredIndex) {
                card.classList.add('hover');
            } else {
                card.classList.add('idle');
            }
        });
    }

    /**
     * 重置卡片状态
     */
    resetCardStates() {
        this.cards.forEach(card => {
            card.classList.remove('hover', 'selected');
            card.classList.add('idle');
        });
    }

    /**
     * 提取选中的符箓（放大展示）
     * @returns {Object|null} 符箓数据
     */
    pickSelected() {
        const index = this.hoveredIndex >= 0 ? this.hoveredIndex : this.selectedIndex;
        
        if (index < 0 || index >= this.talismans.length) {
            return null;
        }
        
        this.pickedTalisman = this.talismans[index];
        
        // 隐藏环绕
        this.hide(true);
        
        // 显示放大
        this.showZoom(this.pickedTalisman);
        
        console.log(`[TalismanSystem] 已提取: ${this.pickedTalisman.name}`);
        
        return this.pickedTalisman;
    }

    /**
     * 显示符箓放大视图
     * @param {Object} talisman 
     */
    showZoom(talisman) {
        this.zoomSymbol.textContent = talisman.symbol;
        this.zoomName.textContent = talisman.name;
        
        // 设置元素颜色
        const card = this.zoomContainer.querySelector('.talisman-zoom__card');
        card.style.borderColor = this.getElementColor(talisman.element);
        
        this.zoomContainer.classList.remove('hidden');
    }

    /**
     * 隐藏放大视图
     */
    hideZoom() {
        this.zoomContainer.classList.add('talisman-dissolve');
        
        setTimeout(() => {
            this.zoomContainer.classList.add('hidden');
            this.zoomContainer.classList.remove('talisman-dissolve');
        }, 800);
    }

    /**
     * 激活当前选中的符箓
     * @returns {Object|null} 激活的符箓数据
     */
    activatePicked() {
        if (!this.pickedTalisman) return null;
        
        const talisman = this.pickedTalisman;
        
        // 隐藏放大视图
        this.hideZoom();
        
        // 触发回调
        if (this.onActivateCallback) {
            this.onActivateCallback(talisman);
        }
        
        console.log(`[TalismanSystem] 激活符箓: ${talisman.name}`);
        
        this.pickedTalisman = null;
        return talisman;
    }

    /**
     * 取消当前操作
     */
    cancel() {
        if (this.pickedTalisman) {
            this.hideZoom();
            this.pickedTalisman = null;
        }
        
        if (this.isVisible) {
            this.hide();
        }
        
        console.log('[TalismanSystem] 操作已取消');
    }

    /**
     * 设置激活回调
     * @param {Function} callback 
     */
    onActivate(callback) {
        this.onActivateCallback = callback;
    }

    onPick(callback) {
        this.onPickCallback = callback;
    }

    /**
     * 获取元素颜色
     * @param {string} element 
     * @returns {string}
     */
    getElementColor(element) {
        const colors = {
            fire: '#FF4500',
            water: '#00BFFF',
            wood: '#32CD32',
            metal: '#FFD700',
            earth: '#CD853F',
            ice: '#E0FFFF',
            thunder: '#9400D3',
            wind: '#FFB6C1'
        };
        return colors[element] || '#FFD700';
    }

    /**
     * 获取当前状态
     * @returns {string}
     */
    getState() {
        if (this.pickedTalisman) return 'picked';
        if (this.isVisible) return 'visible';
        return 'hidden';
    }

    /**
     * 是否有符箓被提取
     * @returns {boolean}
     */
    hasPicked() {
        return this.pickedTalisman !== null;
    }

    /**
     * 获取当前悬停的符箓
     * @returns {Object|null}
     */
    getHovered() {
        if (this.hoveredIndex >= 0 && this.hoveredIndex < this.talismans.length) {
            return this.talismans[this.hoveredIndex];
        }
        return null;
    }
}

// 导出
window.TalismanSystem = TalismanSystem;
