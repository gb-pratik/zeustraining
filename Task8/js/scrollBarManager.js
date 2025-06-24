export class ScrollBarManager {
    constructor(grid, onScroll) {
        this.grid = grid;
        this.onScroll = onScroll;

        this.size = 14;
        this.trackColor = "#f1f1f1";
        this.thumbColor = "#c1c1c1";
        this.thumbHoverColor = "#a8a8a8";

        this.vThumb = null;
        this.hThumb = null;

        this.isDragging = null;
        this.dragStartPos = { x: 0, y: 0 };
    }

    update(scrollX, scrollY) {
        const { canvas, options } = this.grid;
        const totalContentWidth = this.grid.getTotalContentWidth();
        const totalContentHeight = this.grid.getTotalContentHeight();
        const viewWidth = canvas.width;
        const viewHeight = canvas.height;

        if (totalContentHeight > viewHeight) {
            const trackHeight = viewHeight - this.size;
            const thumbHeight = Math.max(
                20,
                (viewHeight / totalContentHeight) * trackHeight
            );
            const scrollableRatio =
                (totalContentHeight - viewHeight) / (trackHeight - thumbHeight);
            const thumbY = scrollY / scrollableRatio;

            this.vThumb = {
                x: viewWidth - this.size,
                y: thumbY,
                width: this.size,
                height: thumbHeight,
            };
        } else {
            this.vThumb = null;
        }

        if (totalContentWidth > viewWidth) {
            const trackWidth = viewWidth - this.size;
            const thumbWidth = Math.max(
                20,
                (viewWidth / totalContentWidth) * trackWidth
            );
            const scrollableRatio =
                (totalContentWidth - viewWidth) / (trackWidth - thumbWidth);
            const thumbX = scrollX / scrollableRatio;

            this.hThumb = {
                x: thumbX,
                y: viewHeight - this.size,
                width: thumbWidth,
                height: this.size,
            };
        } else {
            this.hThumb = null;
        }
    }

    draw(ctx) {
        // Draw Vertical Scrollbar
        if (this.vThumb) {
            ctx.fillStyle = this.trackColor;
            ctx.fillRect(this.vThumb.x, 0, this.size, ctx.canvas.height);
            ctx.fillStyle =
                this.isDragging === "vertical"
                    ? this.thumbHoverColor
                    : this.thumbColor;
            ctx.fillRect(
                this.vThumb.x,
                this.vThumb.y,
                this.vThumb.width,
                this.vThumb.height
            );
        }

        // Draw Horizontal Scrollbar
        if (this.hThumb) {
            // Track
            ctx.fillStyle = this.trackColor;
            ctx.fillRect(0, this.hThumb.y, ctx.canvas.width, this.size);
            // Thumb
            ctx.fillStyle =
                this.isDragging === "horizontal"
                    ? this.thumbHoverColor
                    : this.thumbColor;
            ctx.fillRect(
                this.hThumb.x,
                this.hThumb.y,
                this.hThumb.width,
                this.hThumb.height
            );
        }
    }

    handleMouseDown(x, y) {
        if (this.vThumb && this._isHit(this.vThumb, x, y)) {
            this.isDragging = "vertical";
            this.dragStartPos = { x, y };
            return true;
        }
        if (this.hThumb && this._isHit(this.hThumb, x, y)) {
            this.isDragging = "horizontal";
            this.dragStartPos = { x, y };
            return true;
        }
        return false;
    }

    handleMouseMove(x, y) {
        if (!this.isDragging) return;

        const dx = x - this.dragStartPos.x;
        const dy = y - this.dragStartPos.y;
        this.dragStartPos = { x, y };

        const totalContentWidth = this.grid.getTotalContentWidth();
        const totalContentHeight = this.grid.getTotalContentHeight();
        const viewWidth = this.grid.canvas.width;
        const viewHeight = this.grid.canvas.height;

        let scrollDx = 0;
        let scrollDy = 0;

        if (this.isDragging === "vertical" && this.vThumb) {
            const trackHeight = viewHeight - this.size;
            const scrollableRatio =
                (totalContentHeight - viewHeight) /
                (trackHeight - this.vThumb.height);
            scrollDy = dy * scrollableRatio;
        }

        if (this.isDragging === "horizontal" && this.hThumb) {
            const trackWidth = viewWidth - this.size;
            const scrollableRatio =
                (totalContentWidth - viewWidth) /
                (trackWidth - this.hThumb.width);
            scrollDx = dx * scrollableRatio;
        }

        this.onScroll(scrollDx, scrollDy);
    }

    handleMouseUp() {
        this.isDragging = null;
    }

    _isHit(rect, x, y) {
        return (
            x >= rect.x &&
            x <= rect.x + rect.width &&
            y >= rect.y &&
            y <= rect.y + rect.height
        );
    }
}
