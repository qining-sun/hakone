// Liquid Glass Effect for Search Panel
// Inspired by https://github.com/shuding/liquid-glass

class LiquidGlass {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            intensity: options.intensity || 0.3,
            scale: options.scale || 1.0,
            speed: options.speed || 0.02,
            ...options
        };

        this.mouse = { x: 0, y: 0 };
        this.target = { x: 0, y: 0 };
        this.time = 0;

        this.init();
    }

    init() {
        // Create SVG filter
        this.createSVGFilter();

        // Add event listeners
        this.addEventListeners();

        // Start animation loop
        this.animate();
    }

    createSVGFilter() {
        // Create SVG namespace
        const svgNS = "http://www.w3.org/2000/svg";

        // Create SVG element
        this.svg = document.createElementNS(svgNS, "svg");
        this.svg.setAttribute("width", "0");
        this.svg.setAttribute("height", "0");
        this.svg.style.position = "absolute";
        this.svg.style.pointerEvents = "none";

        // Create defs
        const defs = document.createElementNS(svgNS, "defs");

        // Create filter
        const filter = document.createElementNS(svgNS, "filter");
        filter.setAttribute("id", "liquid-glass-filter");
        filter.setAttribute("x", "-50%");
        filter.setAttribute("y", "-50%");
        filter.setAttribute("width", "200%");
        filter.setAttribute("height", "200%");

        // Create turbulence
        this.turbulence = document.createElementNS(svgNS, "feTurbulence");
        this.turbulence.setAttribute("baseFrequency", "0.02 0.03");
        this.turbulence.setAttribute("numOctaves", "3");
        this.turbulence.setAttribute("result", "noise");

        // Create displacement map
        const displacementMap = document.createElementNS(svgNS, "feDisplacementMap");
        displacementMap.setAttribute("in", "SourceGraphic");
        displacementMap.setAttribute("in2", "noise");
        displacementMap.setAttribute("scale", "10");
        displacementMap.setAttribute("result", "displaced");

        // Create gaussian blur for glass effect
        const blur = document.createElementNS(svgNS, "feGaussianBlur");
        blur.setAttribute("in", "displaced");
        blur.setAttribute("stdDeviation", "0.2");
        blur.setAttribute("result", "blurred");

        // Create color matrix for glass tinting
        const colorMatrix = document.createElementNS(svgNS, "feColorMatrix");
        colorMatrix.setAttribute("in", "blurred");
        colorMatrix.setAttribute("type", "matrix");
        colorMatrix.setAttribute("values", "1.1 0 0 0 0.05  0 1.1 0 0 0.05  0 0 1.2 0 0.1  0 0 0 0.95 0");

        // Append all elements
        filter.appendChild(this.turbulence);
        filter.appendChild(displacementMap);
        filter.appendChild(blur);
        filter.appendChild(colorMatrix);
        defs.appendChild(filter);
        this.svg.appendChild(defs);

        // Add SVG to body
        document.body.appendChild(this.svg);

        // Apply filter to element
        this.element.style.filter = "url(#liquid-glass-filter)";
        this.element.style.transform = "translateZ(0)"; // Force hardware acceleration
    }

    addEventListeners() {
        this.element.addEventListener('mousemove', (e) => {
            const rect = this.element.getBoundingClientRect();
            this.target.x = (e.clientX - rect.left) / rect.width;
            this.target.y = (e.clientY - rect.top) / rect.height;
        });

        this.element.addEventListener('mouseleave', () => {
            this.target.x = 0.5;
            this.target.y = 0.5;
        });
    }

    animate() {
        this.time += this.options.speed;

        // Smooth mouse following
        this.mouse.x += (this.target.x - this.mouse.x) * 0.1;
        this.mouse.y += (this.target.y - this.mouse.y) * 0.1;

        // Update turbulence
        const frequency = 0.02 + Math.sin(this.time) * 0.005;
        const frequencyY = 0.03 + Math.cos(this.time * 0.7) * 0.005;

        this.turbulence.setAttribute("baseFrequency", `${frequency} ${frequencyY}`);

        // Add mouse interaction to displacement
        const scale = 8 + Math.sin(this.time * 2) * 2 + (this.mouse.x + this.mouse.y) * 5;
        const displacementMap = this.svg.querySelector('feDisplacementMap');
        displacementMap.setAttribute("scale", scale.toString());

        requestAnimationFrame(() => this.animate());
    }

    destroy() {
        if (this.svg && this.svg.parentNode) {
            this.svg.parentNode.removeChild(this.svg);
        }
        this.element.style.filter = "";
        this.element.style.transform = "";
    }
}

// Enhanced search panel with liquid glass effect
function initLiquidGlassSearchPanel() {
    const searchPanel = document.querySelector('.search-panel');
    if (searchPanel) {
        // Create liquid glass instance
        const liquidGlass = new LiquidGlass(searchPanel, {
            intensity: 0.4,
            scale: 1.2,
            speed: 0.015
        });

        // Add enhanced backdrop effect
        searchPanel.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.45))';
        searchPanel.style.backdropFilter = 'blur(20px) saturate(180%)';
        searchPanel.style.border = '1px solid rgba(255,255,255,0.3)';
        searchPanel.style.boxShadow = `
            0 8px 32px rgba(0,0,0,0.1),
            inset 0 1px 0 rgba(255,255,255,0.4),
            inset 0 -1px 0 rgba(255,255,255,0.2)
        `;

        // Add subtle animation on hover
        searchPanel.addEventListener('mouseenter', () => {
            searchPanel.style.transform = 'translateY(-2px) scale(1.02)';
            searchPanel.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        });

        searchPanel.addEventListener('mouseleave', () => {
            searchPanel.style.transform = 'translateY(0) scale(1)';
        });

        return liquidGlass;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for other animations to settle
    setTimeout(initLiquidGlassSearchPanel, 1500);
});

// Export for global use
window.LiquidGlass = LiquidGlass;
window.initLiquidGlassSearchPanel = initLiquidGlassSearchPanel;