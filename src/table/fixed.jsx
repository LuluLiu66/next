import React from 'react';
import PropTypes from 'prop-types';
import { findDOMNode } from 'react-dom';
import classnames from 'classnames';
import { dom } from '../util';
import HeaderComponent from './fixed/header';
import BodyComponent from './fixed/body';
import WrapperComponent from './fixed/wrapper';
import { statics } from './util';

export default function fixed(BaseComponent, stickyLock) {
    /** Table */
    class FixedTable extends React.Component {
        static FixedHeader = HeaderComponent;
        static FixedBody = BodyComponent;
        static FixedWrapper = WrapperComponent;
        static propTypes = {
            /**
             * 是否具有表头
             */
            hasHeader: PropTypes.bool,
            /**
             * 表头是否固定，该属性配合maxBodyHeight使用，当内容区域的高度超过maxBodyHeight的时候，在内容区域会出现滚动条
             */
            fixedHeader: PropTypes.bool,
            /**
             * 最大内容区域的高度,在`fixedHeader`为`true`的时候,超过这个高度会出现滚动条
             */
            maxBodyHeight: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
            ...BaseComponent.propTypes,
        };

        static defaultProps = {
            ...BaseComponent.defaultProps,
            hasHeader: true,
            fixedHeader: false,
            maxBodyHeight: 200,
            components: {},
            refs: {},
            prefix: 'next-',
        };

        static childContextTypes = {
            fixedHeader: PropTypes.bool,
            getNode: PropTypes.func,
            onFixedScrollSync: PropTypes.func,
            getTableInstanceForFixed: PropTypes.func,
            maxBodyHeight: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        };

        state = {};

        getChildContext() {
            return {
                fixedHeader: this.props.fixedHeader,
                maxBodyHeight: this.props.maxBodyHeight,
                getTableInstanceForFixed: this.getTableInstance,
                onFixedScrollSync: this.onFixedScrollSync,
                getNode: this.getNode,
            };
        }

        componentDidMount() {
            this.adjustFixedHeaderSize();
            this.scrollToRightEnd = undefined;
            this.onFixedScrollSync({ currentTarget: this.bodyNode });
        }

        componentDidUpdate() {
            this.adjustFixedHeaderSize();
            this.onFixedScrollSync({ currentTarget: this.bodyNode });
        }

        getNode = (type, node, lockType) => {
            lockType = lockType ? lockType.charAt(0).toUpperCase() + lockType.substr(1) : '';
            this[`${type}${lockType}Node`] = node;
        };

        getTableInstance = (type, instance) => {
            type = '';
            this[`table${type}Inc`] = instance;
        };

        getTableNode() {
            const table = this.tableInc;
            try {
                // in case of finding an unmounted component due to cached data
                // need to clear refs of table when dataSource Changed
                // use try catch for temporary
                return findDOMNode(table.tableEl);
            } catch (error) {
                return null;
            }
        }

        // for fixed header scroll left
        onFixedScrollSync = (current = { currentTarget: {} }) => {
            const currentTarget = current.currentTarget || {},
                headerNode = this.headerNode,
                bodyNode = this.bodyNode;

            const { scrollLeft, scrollWidth, clientWidth } = currentTarget;
            const scrollToRightEnd = !(scrollLeft < scrollWidth - clientWidth);

            if (scrollToRightEnd !== this.scrollToRightEnd) {
                this.scrollToRightEnd = scrollToRightEnd;
                const { prefix } = this.props;
                const table = this.getTableNode();

                const leftFunc = scrollToRightEnd ? 'removeClass' : 'addClass';
                dom[leftFunc](table, `${prefix}table-scrolling-to-right`);
            }
            if (current.currentTarget !== current.target) {
                return;
            }
            if (currentTarget === bodyNode) {
                if (headerNode && scrollLeft !== headerNode.scrollLeft) {
                    headerNode.scrollLeft = scrollLeft;
                }
            } else if (currentTarget === headerNode) {
                if (bodyNode && scrollLeft !== bodyNode.scrollLeft) {
                    bodyNode.scrollLeft = scrollLeft;
                }
            }
        };

        adjustFixedHeaderSize() {
            const { hasHeader, rtl } = this.props;
            const paddingName = rtl ? 'paddingLeft' : 'paddingRight';
            const marginName = rtl ? 'marginLeft' : 'marginRight';
            const body = this.bodyNode;

            if (hasHeader && !this.props.lockType && body) {
                const scrollBarSize = +dom.scrollbar().width || 0;
                const hasVerScroll = body.scrollHeight > body.clientHeight,
                    hasHozScroll = body.scrollWidth > body.clientWidth;
                const style = {
                    [marginName]: scrollBarSize,
                };

                if (!stickyLock) {
                    style[paddingName] = scrollBarSize;
                }

                if (!hasVerScroll) {
                    style[paddingName] = 0;
                    style[marginName] = 0;
                }

                if (+scrollBarSize) {
                    style.marginBottom = -scrollBarSize;
                    if (hasHozScroll) {
                        style.paddingBottom = scrollBarSize;
                    } else {
                        style.paddingBottom = scrollBarSize;
                        style[marginName] = 0;
                    }
                }

                dom.setStyle(this.headerNode, style);
            }
        }

        render() {
            /* eslint-disable no-unused-vars, prefer-const */
            let {
                components,
                className,
                prefix,
                fixedHeader,
                lockType,
                dataSource,
                maxBodyHeight,
                ...others
            } = this.props;
            if (fixedHeader) {
                components = { ...components };
                if (!components.Header) {
                    components.Header = HeaderComponent;
                }
                if (!components.Body) {
                    components.Body = BodyComponent;
                }
                if (!components.Wrapper) {
                    components.Wrapper = WrapperComponent;
                }
                className = classnames({
                    [`${prefix}table-fixed`]: true,
                    [`${prefix}table-wrap-empty`]: !dataSource.length,
                    [className]: className,
                });
            }

            return (
                <BaseComponent
                    {...others}
                    dataSource={dataSource}
                    lockType={lockType}
                    components={components}
                    className={className}
                    prefix={prefix}
                />
            );
        }
    }
    statics(FixedTable, BaseComponent);
    return FixedTable;
}
