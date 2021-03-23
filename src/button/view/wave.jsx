import React from 'react';
import { findDOMNode } from 'react-dom';
import PropTypes from 'prop-types';
import TransitionEvents from '../../util/transition';
import raf from '../../util/raf';

let styleForPesudo;

// Where el is the DOM element you'd like to test for visibility
function isHidden(element) {
    if (process.env.NODE_ENV === 'test') {
        return false;
    }
    return !element || element.offsetParent === null;
}

export default class Wave extends React.Component {
    constructor(props) {
        super(props);
        this.animationStart = false;
        this.destroyed = false;
        this.instance = {
            cancel: () => {},
        };
    }

    static propTypes = {
        // 要显示水波动效的结点
        children: PropTypes.node,
    };

    componentDidMount() {
        const node = findDOMNode(this);
        if (!node || node.nodeType !== 1) {
            return;
        }
        this.instance = this.bindAnimationEvent(node);
    }

    componentWillUnmount() {
        if (this.instance) {
            this.instance.cancel();
        }
        if (this.clickWaveTimeoutId) {
            clearTimeout(this.clickWaveTimeoutId);
        }

        this.destroyed = true;
    }

    onClick = (node, waveColor) => {
        if (!node || isHidden(node)) {
            return;
        }
        let spread;
        if (/next-small/.test(node.className)) spread = '5px';
        else if (/next-large/.test(node.className)) spread = '7px';
        else spread = '6px';
        // Not white or transparnt or grey
        styleForPesudo = styleForPesudo || document.createElement('style');
        if (
            waveColor &&
            waveColor !== '#ffffff' &&
            waveColor !== 'rgb(255, 255, 255)' &&
            waveColor !== 'transparent' &&
            node.className.indexOf('text') === -1
        ) {
            styleForPesudo.innerHTML = `
      [next-btn-click-animating-without-extra-node='true']::after, .next-btn-click-animating-node {
        --next-wave-shadow-color: ${waveColor};
        --next-wave-shadow-spread: ${spread};
        --next-wave-border-width: ${getComputedStyle(node).getPropertyValue('border-width') ||
            getComputedStyle(node).getPropertyValue('border-top-width')};
      }`;
            if (!document.body.contains(styleForPesudo)) {
                document.body.appendChild(styleForPesudo);
            }
        }
        const attributeName = this.getAttributeName();
        node.setAttribute(attributeName, 'true');

        TransitionEvents.addStartEventListener(node, this.onTransitionStart);
        TransitionEvents.addEndEventListener(node, this.onTransitionEnd);
    };

    onTransitionStart = e => {
        if (this.destroyed) {
            return;
        }

        const node = findDOMNode(this);
        if (!e || e.target !== node || this.animationStart) {
            return;
        }
        this.resetEffect(node);
    };

    onTransitionEnd = e => {
        if (!e || e.animationName !== 'fadeEffect') {
            return;
        }
        this.resetEffect(e.target);
    };

    getAttributeName() {
        return `next-btn-click-animating-without-extra-node`;
    }

    bindAnimationEvent = node => {
        if (!node || !node.getAttribute || node.getAttribute('disabled') || node.className.indexOf('disabled') >= 0) {
            return;
        }
        const onClick = e => {
            // Fix radio button click twice
            if (e.target.tagName === 'INPUT' || isHidden(e.target)) {
                return;
            }
            this.resetEffect(node);
            // Get wave color from target
            const color1 = getComputedStyle(node).getPropertyValue('border-top-color');
            const color2 = getComputedStyle(node).getPropertyValue('border-color');
            const color3 = getComputedStyle(node).getPropertyValue('background-color');
            let waveColor =
                (color1 !== 'transparent' &&
                !/rgba\((?:\d*, ){3}0\)/.test(color1) && // any transparent rgba color
                    color1) || // Firefox Compatible
                (color2 !== 'transparent' &&
                !/rgba\((?:\d*, ){3}0\)/.test(color2) && // any transparent rgba color
                    color2) ||
                (color3 !== 'transparent' &&
                !/rgba\((?:\d*, ){3}0\)/.test(color3) && // any transparent rgba color
                    color3);
            if (
                node.className.indexOf('inverse') !== -1 ||
                (node.className.indexOf('ghost') !== -1 && node.className.indexOf('dark') !== -1)
            )
                waveColor = '#FFF';
            this.clickWaveTimeoutId = window.setTimeout(() => this.onClick(node, waveColor), 0);
            raf.cancel(this.animationStartId);
            this.animationStart = true;
            // Render to trigger transition event cost 3 frames. Let's delay 10 frames to reset this.
            this.animationStartId = raf(() => {
                this.animationStart = false;
            }, 10);
        };
        node.addEventListener('click', onClick, true);
        return {
            cancel: () => {
                node.removeEventListener('click', onClick, true);
            },
        };
    };

    resetEffect(node) {
        if (!node || !(node instanceof Element)) {
            return;
        }
        const attributeName = this.getAttributeName();
        node.setAttribute(attributeName, 'false'); // edge has bug on `removeAttribute` #14466
        if (styleForPesudo) {
            styleForPesudo.innerHTML = '';
        }

        TransitionEvents.removeStartEventListener(node, this.onTransitionStart);
        TransitionEvents.removeEndEventListener(node, this.onTransitionEnd);
    }

    render() {
        const { children } = this.props;

        return children;
    }
}
