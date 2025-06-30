export class ScrollBarManager {
    // Initializes the ScrollBarManager, setting up initial properties and event handlers.
    constructor(grid, onScroll) {
        this.grid = grid;
        this.onScroll = onScroll;

        this.size = 12;
        this.trackColor = "#f0f0f0";
        this.thumbColor = "#cccccc";
        this.thumbActiveColor = "#9e9e9e";

        this.vThumb = null;
        this.hThumb = null;

        this.isDragging = null;
        this.dragStartPos = { x: 0, y: 0 };
        this.dragContentSize = { width: 0, height: 0 };
    }

    // Recalculates the visibility, size, and position of the scrollbar thumbs.
    // This should be called whenever the grid's content or dimensions change.
    update(scrollX, scrollY) {
        const { canvas } = this.grid;
        const totalContentWidth = this.grid.getTotalContentWidth();
        const totalContentHeight = this.grid.getTotalContentHeight();
        const viewWidth = canvas.clientWidth;
        const viewHeight = canvas.clientHeight;

        if (totalContentHeight > viewHeight) {
            const trackHeight = viewHeight - this.size;
            const thumbHeight = Math.max(
                20,
                (viewHeight / totalContentHeight) * trackHeight
            );
            const scrollableRange = totalContentHeight - viewHeight;
            const thumbMovableRange = trackHeight - thumbHeight;
            const thumbY =
                thumbMovableRange > 0
                    ? (scrollY / scrollableRange) * thumbMovableRange
                    : 0;

            this.vThumb = {
                x: viewWidth - this.size,
                y: thumbY,
                width: 6,
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
            const scrollableRange = totalContentWidth - viewWidth;
            const thumbMovableRange = trackWidth - thumbWidth;
            const thumbX =
                thumbMovableRange > 0
                    ? (scrollX / scrollableRange) * thumbMovableRange
                    : 0;

            this.hThumb = {
                x: thumbX,
                y: viewHeight - this.size,
                width: thumbWidth,
                height: 6,
            };
        } else {
            this.hThumb = null;
        }
    }

    // Renders the vertical and horizontal scrollbars and thumbs on the canvas.
    // Highlights the thumb if it's currently being dragged.
    draw(ctx) {
        const viewWidth = this.grid.canvas.clientWidth;
        const viewHeight = this.grid.canvas.clientHeight;

        // Draw Vertical Scrollbar
        if (this.vThumb) {
            ctx.fillStyle = this.trackColor;
            ctx.fillRect(this.vThumb.x, 0, this.size, viewHeight);
            ctx.fillStyle =
                this.isDragging === "vertical"
                    ? this.thumbActiveColor
                    : this.thumbColor;
            ctx.fillRect(
                this.vThumb.x + 3,
                this.vThumb.y,
                this.vThumb.width,
                this.vThumb.height
            );
        }

        // Draw Horizontal Scrollbar
        if (this.hThumb) {
            // Track
            ctx.fillStyle = this.trackColor;
            ctx.fillRect(0, this.hThumb.y, viewWidth, this.size);
            // Thumb
            ctx.fillStyle =
                this.isDragging === "horizontal"
                    ? this.thumbActiveColor
                    : this.thumbColor;
            ctx.fillRect(
                this.hThumb.x,
                this.hThumb.y + 3,
                this.hThumb.width,
                this.hThumb.height
            );
        }
    }

    // Checks if a mousedown event hits a scrollbar thumb and initiates the dragging state.
    // Returns true if a drag is started, otherwise false.
    handleMouseDown(x, y) {
        if (this.vThumb && this._isHit(this.vThumb, x, y)) {
            this.isDragging = "vertical";
            this.dragStartPos = { x, y };
            this.dragContentSize.height = this.grid.getTotalContentHeight();
            return true;
        }
        if (this.hThumb && this._isHit(this.hThumb, x, y)) {
            this.isDragging = "horizontal";
            this.dragStartPos = { x, y };
            this.dragContentSize.width = this.grid.getTotalContentWidth();
            return true;
        }
        return false;
    }

    // Handles the mouse move event to scroll the grid when a thumb is being dragged.
    // Calculates the scroll delta based on the mouse movement.
    handleMouseMove(x, y) {
        if (!this.isDragging) return;

        const dx = x - this.dragStartPos.x;
        const dy = y - this.dragStartPos.y;

        this.dragStartPos = { x, y };

        const viewWidth = this.grid.canvas.clientWidth;
        const viewHeight = this.grid.canvas.clientHeight;

        let scrollDx = 0;
        let scrollDy = 0;

        if (this.isDragging === "vertical" && this.vThumb) {
            const totalContentHeight = this.dragContentSize.height;
            const trackHeight = viewHeight - this.size;
            const thumbMovableRange = trackHeight - this.vThumb.height;
            if (thumbMovableRange > 0) {
                const scrollableRatio =
                    (totalContentHeight - viewHeight) / thumbMovableRange;
                scrollDy = dy * scrollableRatio;
            }
        }

        if (this.isDragging === "horizontal" && this.hThumb) {
            const totalContentWidth = this.dragContentSize.width;
            const trackWidth = viewWidth - this.size;
            const thumbMovableRange = trackWidth - this.hThumb.width;
            if (thumbMovableRange > 0) {
                const scrollableRatio =
                    (totalContentWidth - viewWidth) / thumbMovableRange;
                scrollDx = dx * scrollableRatio;
            }
        }

        if (scrollDx !== 0 || scrollDy !== 0) {
            this.onScroll(scrollDx, scrollDy);
        }
    }

    // Resets the dragging state when the mouse button is released.
    handleMouseUp() {
        this.isDragging = null;
    }

    // Private helper method to check if a given x, y coordinate is within a rectangle.
    _isHit(rect, x, y) {
        return (
            x >= rect.x &&
            x <= rect.x + rect.width &&
            y >= rect.y &&
            y <= rect.y + rect.height
        );
    }
}
