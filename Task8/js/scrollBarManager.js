export class ScrollBarManager {
    // Initializes the ScrollBarManager, setting up initial properties and event handlers.
    constructor(grid, onScroll) {
        this.grid = grid;
        this.onScroll = onScroll;

        // --- Appearance ---
        this.size = 12; // A bit thinner like modern UIs
        this.arrowSize = this.size;
        this.trackColor = "#f1f1f1";
        this.thumbColor = "#8a8a8a";
        this.thumbActiveColor = "#a8a8a8";
        this.arrowColor = "#606060";

        // --- State ---
        this.vThumb = null;
        this.hThumb = null;
        this.vTrack = null;
        this.hTrack = null;
        this.arrows = {}; // To hold vUp, vDown, hLeft, hRight rects

        this.isDragging = null; // 'vertical' or 'horizontal'
        this.isPaging = null; // 'up', 'down', 'left', 'right'
        this.pagingIntervalId = null;

        this.dragStartPos = { x: 0, y: 0 };
    }

    // Recalculates the visibility, size, and position of all scrollbar components.
    update(scrollX, scrollY) {
        const { canvas } = this.grid;
        const totalContentWidth = this.grid.getTotalContentWidth();
        const totalContentHeight = this.grid.getTotalContentHeight();
        const viewWidth = canvas.clientWidth;
        const viewHeight = canvas.clientHeight;

        const hasVScroll = totalContentHeight > viewHeight;
        const hasHScroll = totalContentWidth > viewWidth;

        // Vertical Scrollbar
        if (hasVScroll) {
            this.vTrack = {
                x: viewWidth - this.size,
                y: 0,
                width: this.size,
                height: viewHeight,
            };
            const trackHeight =
                viewHeight - (hasHScroll ? this.size : 0) - 2 * this.arrowSize;
            const thumbHeight = Math.max(
                20,
                (viewHeight / totalContentHeight) * trackHeight
            );
            const scrollableRange = totalContentHeight - viewHeight;
            const thumbMovableRange = trackHeight - thumbHeight;
            const thumbY =
                this.arrowSize +
                (thumbMovableRange > 0
                    ? (scrollY / scrollableRange) * thumbMovableRange
                    : 0);

            this.vThumb = {
                x: this.vTrack.x + 2,
                y: thumbY,
                width: this.size - 4,
                height: thumbHeight,
            };
            this.arrows.vUp = {
                x: this.vTrack.x,
                y: 0,
                width: this.size,
                height: this.arrowSize,
            };
            this.arrows.vDown = {
                x: this.vTrack.x,
                y: viewHeight - this.arrowSize - (hasHScroll ? this.size : 0),
                width: this.size,
                height: this.arrowSize,
            };
        } else {
            this.vThumb = null;
            this.vTrack = null;
            this.arrows.vUp = null;
            this.arrows.vDown = null;
        }

        // Horizontal Scrollbar
        if (hasHScroll) {
            this.hTrack = {
                x: 0,
                y: viewHeight - this.size,
                width: viewWidth,
                height: this.size,
            };
            const trackWidth =
                viewWidth - (hasVScroll ? this.size : 0) - 2 * this.arrowSize;
            const thumbWidth = Math.max(
                20,
                (viewWidth / totalContentWidth) * trackWidth
            );
            const scrollableRange = totalContentWidth - viewWidth;
            const thumbMovableRange = trackWidth - thumbWidth;
            const thumbX =
                this.arrowSize +
                (thumbMovableRange > 0
                    ? (scrollX / scrollableRange) * thumbMovableRange
                    : 0);

            this.hThumb = {
                x: thumbX,
                y: this.hTrack.y + 2,
                width: thumbWidth,
                height: this.size - 4,
            };
            this.arrows.hLeft = {
                x: 0,
                y: this.hTrack.y,
                width: this.arrowSize,
                height: this.size,
            };
            this.arrows.hRight = {
                x: viewWidth - this.arrowSize - (hasVScroll ? this.size : 0),
                y: this.hTrack.y,
                width: this.arrowSize,
                height: this.size,
            };
        } else {
            this.hThumb = null;
            this.hTrack = null;
            this.arrows.hLeft = null;
            this.arrows.hRight = null;
        }
    }

    // Renders the scrollbars on the canvas.
    draw(ctx) {
        // Draw Vertical Scrollbar Track & Arrows
        if (this.vTrack) {
            ctx.fillStyle = this.trackColor;
            ctx.fillRect(
                this.vTrack.x,
                this.vTrack.y,
                this.vTrack.width,
                this.vTrack.height
            );
            this._drawArrow(ctx, this.arrows.vUp, "up");
            this._drawArrow(ctx, this.arrows.vDown, "down");
        }

        // Draw Horizontal Scrollbar Track & Arrows
        if (this.hTrack) {
            ctx.fillStyle = this.trackColor;
            ctx.fillRect(
                this.hTrack.x,
                this.hTrack.y,
                this.hTrack.width,
                this.hTrack.height
            );
            this._drawArrow(ctx, this.arrows.hLeft, "left");
            this._drawArrow(ctx, this.arrows.hRight, "right");
        }

        // Draw Thumbs
        if (this.vThumb) {
            ctx.fillStyle =
                this.isDragging === "vertical"
                    ? this.thumbActiveColor
                    : this.thumbColor;
            this._drawRoundedRect(
                ctx,
                this.vThumb.x,
                this.vThumb.y,
                this.vThumb.width,
                this.vThumb.height,
                5
            );
        }
        if (this.hThumb) {
            ctx.fillStyle =
                this.isDragging === "horizontal"
                    ? this.thumbActiveColor
                    : this.thumbColor;
            this._drawRoundedRect(
                ctx,
                this.hThumb.x,
                this.hThumb.y,
                this.hThumb.width,
                this.hThumb.height,
                5
            );
        }
    }

    // Handles pointerdown to initiate dragging, paging, or arrow scrolling.
    handlePointerDown(x, y) {
        // Arrow clicks
        if (this.arrows.vUp && this._isHit(this.arrows.vUp, x, y)) {
            this._startPaging("up");
            return true;
        }
        if (this.arrows.vDown && this._isHit(this.arrows.vDown, x, y)) {
            this._startPaging("down");
            return true;
        }
        if (this.arrows.hLeft && this._isHit(this.arrows.hLeft, x, y)) {
            this._startPaging("left");
            return true;
        }
        if (this.arrows.hRight && this._isHit(this.arrows.hRight, x, y)) {
            this._startPaging("right");
            return true;
        }

        // Thumb drag
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

        // Track clicks (paging)
        if (this.vTrack && this._isHit(this.vTrack, x, y)) {
            this._startPaging(y < this.vThumb.y ? "up-page" : "down-page");
            return true;
        }
        if (this.hTrack && this._isHit(this.hTrack, x, y)) {
            this._startPaging(x < this.hThumb.x ? "left-page" : "right-page");
            return true;
        }

        return false;
    }

    // Handles pointer movement for thumb dragging.
    handlePointerMove(x, y) {
        if (!this.isDragging) return;
        const dx = x - this.dragStartPos.x;
        const dy = y - this.dragStartPos.y;
        this.dragStartPos = { x, y };

        if (this.isDragging === "vertical" && this.vThumb) {
            const trackHeight =
                this.vTrack.height -
                2 * this.arrowSize -
                (this.hTrack ? this.size : 0);
            const scrollableRatio =
                (this.grid.getTotalContentHeight() -
                    this.grid.canvas.clientHeight) /
                (trackHeight - this.vThumb.height);
            this.onScroll(0, dy * scrollableRatio);
        }

        if (this.isDragging === "horizontal" && this.hThumb) {
            const trackWidth =
                this.hTrack.width -
                2 * this.arrowSize -
                (this.vTrack ? this.size : 0);
            const scrollableRatio =
                (this.grid.getTotalContentWidth() -
                    this.grid.canvas.clientWidth) /
                (trackWidth - this.hThumb.width);
            this.onScroll(dx * scrollableRatio, 0);
        }
    }

    // Resets dragging/paging state on pointer up.
    handlePointerUp() {
        this.isDragging = null;
        this._stopPaging();
    }

    // Public method for the grid to check if a click is on any scrollbar part.
    isPointerEventOnScrollBar(x, y) {
        return (
            (this.vTrack && this._isHit(this.vTrack, x, y)) ||
            (this.hTrack && this._isHit(this.hTrack, x, y))
        );
    }

    // --- Private Helper Methods ---

    _startPaging(direction) {
        this.isPaging = direction;
        const pageScroll = () => {
            const { clientWidth, clientHeight } = this.grid.canvas;
            switch (this.isPaging) {
                case "up":
                    this.onScroll(0, -this.grid.options.defaultRowHeight);
                    break;
                case "down":
                    this.onScroll(0, this.grid.options.defaultRowHeight);
                    break;
                case "left":
                    this.onScroll(-this.grid.options.defaultColWidth, 0);
                    break;
                case "right":
                    this.onScroll(this.grid.options.defaultColWidth, 0);
                    break;
                case "up-page":
                    this.onScroll(
                        0,
                        -clientHeight + this.grid.options.headerHeight
                    );
                    break;
                case "down-page":
                    this.onScroll(
                        0,
                        clientHeight - this.grid.options.headerHeight
                    );
                    break;
                case "left-page":
                    this.onScroll(
                        -clientWidth + this.grid.options.headerWidth,
                        0
                    );
                    break;
                case "right-page":
                    this.onScroll(
                        clientWidth - this.grid.options.headerWidth,
                        0
                    );
                    break;
            }
        };

        pageScroll(); // Scroll once immediately
        this.pagingIntervalId = setInterval(pageScroll, 100);
    }

    _stopPaging() {
        if (this.pagingIntervalId) {
            clearInterval(this.pagingIntervalId);
            this.pagingIntervalId = null;
        }
        this.isPaging = null;
    }

    _drawArrow(ctx, rect, direction) {
        if (!rect) return;
        ctx.fillStyle = this.arrowColor;
        const centerX = rect.x + rect.width / 2;
        const centerY = rect.y + rect.height / 2;
        const offset = 3;

        ctx.beginPath();
        switch (direction) {
            case "up":
                ctx.moveTo(centerX, centerY - offset);
                ctx.lineTo(centerX - offset, centerY + offset);
                ctx.lineTo(centerX + offset, centerY + offset);
                break;
            case "down":
                ctx.moveTo(centerX, centerY + offset);
                ctx.lineTo(centerX - offset, centerY - offset);
                ctx.lineTo(centerX + offset, centerY - offset);
                break;
            case "left":
                ctx.moveTo(centerX - offset, centerY);
                ctx.lineTo(centerX + offset, centerY - offset);
                ctx.lineTo(centerX + offset, centerY + offset);
                break;
            case "right":
                ctx.moveTo(centerX + offset, centerY);
                ctx.lineTo(centerX - offset, centerY - offset);
                ctx.lineTo(centerX - offset, centerY + offset);
                break;
        }
        ctx.closePath();
        ctx.fill();
    }

    _drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.arcTo(x + width, y, x + width, y + radius, radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.arcTo(
            x + width,
            y + height,
            x + width - radius,
            y + height,
            radius
        );
        ctx.lineTo(x + radius, y + height);
        ctx.arcTo(x, y + height, x, y + height - radius, radius);
        ctx.lineTo(x, y + radius);
        ctx.arcTo(x, y, x + radius, y, radius);
        ctx.closePath();
        ctx.fill();
    }

    _isHit(rect, x, y) {
        return (
            rect &&
            x >= rect.x &&
            x <= rect.x + rect.width &&
            y >= rect.y &&
            y <= rect.y + rect.height
        );
    }
}
