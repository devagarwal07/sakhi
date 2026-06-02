/**
 * SakhiModal — Reusable in-app alert/confirm modal
 * Matches the Sakhi design system (lavender/purple palette).
 *
 * Usage:
 *   const [modal, setModal] = useState(null);
 *
 *   // Show an info modal:
 *   setModal({
 *     icon: '🔔',
 *     title: 'Title',
 *     message: 'Body text here.',
 *     buttons: [{ text: 'OK', onPress: () => setModal(null) }],
 *   });
 *
 *   // Show confirm/destructive:
 *   setModal({
 *     icon: '⚠️',
 *     title: 'Cancel Ride?',
 *     message: 'You will lose your booking.',
 *     buttons: [
 *       { text: 'Keep Ride', style: 'cancel', onPress: () => setModal(null) },
 *       { text: 'Yes, Cancel', style: 'destructive', onPress: () => { setModal(null); doCancel(); } },
 *     ],
 *   });
 *
 *   <SakhiModal config={modal} onClose={() => setModal(null)} />
 */

import React, { useEffect, useRef } from 'react';
import {
    Modal, View, Text, StyleSheet, TouchableOpacity,
    Animated, Platform, Dimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const RetryIcon = () => (
    <Svg viewBox="0 0 640 640" width={28} height={28}>
        <Path fill="rgb(248, 130, 250)" d="M500.7 138.7L512 149.4L512 96C512 78.3 526.3 64 544 64C561.7 64 576 78.3 576 96L576 224C576 241.7 561.7 256 544 256L416 256C398.3 256 384 241.7 384 224C384 206.3 398.3 192 416 192L463.9 192L456.3 184.8C456.1 184.6 455.9 184.4 455.7 184.2C380.7 109.2 259.2 109.2 184.2 184.2C109.2 259.2 109.2 380.7 184.2 455.7C259.2 530.7 380.7 530.7 455.7 455.7C463.9 447.5 471.2 438.8 477.6 429.6C487.7 415.1 507.7 411.6 522.2 421.7C536.7 431.8 540.2 451.8 530.1 466.3C521.6 478.5 511.9 490.1 501 501C401 601 238.9 601 139 501C39.1 401 39 239 139 139C238.9 39.1 400.7 39 500.7 138.7z"/>
    </Svg>
);

export default function SakhiModal({ config, onClose, inline = false }) {
    const scaleAnim = useRef(new Animated.Value(0.88)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const visible = !!config;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 220 }),
                Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
            ]).start();
        } else {
            scaleAnim.setValue(0.88);
            fadeAnim.setValue(0);
        }
    }, [visible]);

    if (!config) return null;

    const { icon, title, message, buttons = [] } = config;

    const handlePress = (btn) => {
        if (btn.onPress) btn.onPress();
        else if (onClose) onClose();
    };

    const content = (
        <>
            {/* Backdrop */}
            <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
                <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
            </Animated.View>

            {/* Card */}
            <View style={styles.centeredView} pointerEvents="box-none">
                <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>

                    {/* Icon badge */}
                    {icon ? (
                        <View style={styles.iconBadge}>
                            {icon === '🔄' ? (
                                <RetryIcon />
                            ) : icon === '⚠️' ? (
                                <Feather name="alert-triangle" size={26} color="#DC2626" />
                            ) : icon === '🔔' ? (
                                <Feather name="bell" size={26} color="#BEA3D8" />
                            ) : icon === '🔗' ? (
                                <Feather name="link" size={26} color="#BEA3D8" />
                            ) : icon === '🔍' ? (
                                <Feather name="search" size={26} color="#BEA3D8" />
                            ) : icon === '✅' ? (
                                <Feather name="check-circle" size={26} color="#10B981" />
                            ) : icon === '🎁' ? (
                                <Svg width="26" height="26" viewBox="0 0 14 14" fill="none">
                                    <Path d="M11.6667 4.08333H9.275C9.72417 3.65167 10.0333 3.0625 10.0333 2.45C10.0333 1.155 8.94833 0.116669 7.64167 0.116669C6.88333 0.116669 6.20667 0.501669 5.83333 1.09667C5.46 0.501669 4.78333 0.116669 4.025 0.116669C2.71833 0.116669 1.63333 1.155 1.63333 2.45C1.63333 3.0625 1.9425 3.65167 2.39167 4.08333H0V6.41667H1.16667V12.8333H10.5V6.41667H11.6667V4.08333ZM7.64167 1.28334C8.30667 1.28334 8.86667 1.80834 8.86667 2.45C8.86667 3.09167 8.30667 3.61667 7.64167 3.61667C6.97667 3.61667 6.41667 3.09167 6.41667 2.45C6.41667 1.80834 6.97667 1.28334 7.64167 1.28334ZM4.025 1.28334C4.69 1.28334 5.25 1.80834 5.25 2.45C5.25 3.09167 4.69 3.61667 4.025 3.61667C3.36 3.61667 2.8 3.09167 2.8 2.45C2.8 1.80834 3.36 1.28334 4.025 1.28334ZM2.33333 11.6667V6.41667H5.25V11.6667H2.33333ZM6.41667 11.6667V6.41667H9.33333V11.6667H6.41667ZM10.5 5.25H1.16667V5.25H10.5V5.25Z" fill="#BEA3D8"/>
                                </Svg>
                            ) : icon === 'ⓘ' || icon === 'ℹ️' ? (
                                <Feather name="info" size={26} color="#BEA3D8" />
                            ) : icon === '💬' ? (
                                <Feather name="message-circle" size={26} color="#BEA3D8" />
                            ) : icon === '🛡️' ? (
                                <Feather name="shield" size={26} color="#BEA3D8" />
                            ) : icon === '💡' ? (
                                <Feather name="zap" size={26} color="#F59E0B" />
                            ) : icon === '📅' ? (
                                <Feather name="calendar" size={26} color="#BEA3D8" />
                            ) : icon === '📝' ? (
                                <Feather name="edit-3" size={26} color="#BEA3D8" />
                            ) : icon === '📞' || icon === '📧' || icon === '✉️' ? (
                                <Feather name={icon === '📞' ? 'phone' : 'mail'} size={26} color="#BEA3D8" />
                            ) : icon === '📤' ? (
                                <Feather name="share" size={26} color="#BEA3D8" />
                            ) : icon === '📥' ? (
                                <Feather name="download" size={26} color="#BEA3D8" />
                            ) : icon === '📶' ? (
                                <Feather name="wifi" size={26} color="#BEA3D8" />
                            ) : icon === '⚙️' ? (
                                <Feather name="settings" size={26} color="#BEA3D8" />
                            ) : icon === '✏️' ? (
                                <Feather name="edit-2" size={26} color="#BEA3D8" />
                            ) : icon === '🌐' ? (
                                <Feather name="globe" size={26} color="#BEA3D8" />
                            ) : icon === '🍪' ? (
                                <Feather name="disc" size={26} color="#BEA3D8" />
                            ) : icon === '🎯' ? (
                                <Feather name="target" size={26} color="#BEA3D8" />
                            ) : icon === '📄' ? (
                                <Feather name="file-text" size={26} color="#BEA3D8" />
                            ) : icon === '🗑️' ? (
                                <Feather name="trash-2" size={26} color="#DC2626" />
                            ) : icon === '🛒' ? (
                                <Feather name="shopping-cart" size={26} color="#BEA3D8" />
                            ) : icon === '▶️' ? (
                                <Feather name="play" size={26} color="#10B981" />
                            ) : icon === '⏸️' ? (
                                <Feather name="pause" size={26} color="#F59E0B" />
                            ) : icon === '⏳' ? (
                                <Svg width="26" height="26" viewBox="0 0 14 14" fill="none">
                                    <Path d="M12.25 0H1.75V3.5L5.25 7L1.75 10.5V14H12.25V10.5L8.75 7L12.25 3.5V0ZM10.5 11.6667V12.25H3.5V11.6667L6.41667 8.75H7.58333L10.5 11.6667ZM7.58333 5.25H6.41667L3.5 2.33333V1.75H10.5V2.33333L7.58333 5.25Z" fill="#BEA3D8"/>
                                </Svg>
                            ) : typeof icon === 'string' && !icon.match(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2B50}\u{FE00}-\u{FE0F}]/u) ? (
                                <Feather name={icon} size={26} color="#BEA3D8" />
                            ) : typeof icon === 'string' ? (
                                <Text style={styles.iconText}>{icon}</Text>
                            ) : (
                                icon
                            )}
                        </View>
                    ) : null}

                    {/* Title */}
                    {title ? <Text style={styles.title}>{title}</Text> : null}

                    {/* Message */}
                    {message ? <Text style={styles.message}>{message}</Text> : null}

                    {/* Buttons */}
                    <View style={[styles.buttonsRow, (buttons.length === 1 || buttons.length > 2) && styles.buttonsStack]}>
                        {buttons.map((btn, i) => {
                            const isDestructive = btn.style === 'destructive';
                            const isCancel = btn.style === 'cancel';
                            return (
                                <TouchableOpacity
                                    key={i}
                                    style={[
                                        styles.btn,
                                        (buttons.length === 1 || buttons.length > 2) && styles.btnFull,
                                        isDestructive && styles.btnDestructive,
                                        isCancel && styles.btnCancel,
                                        !isDestructive && !isCancel && styles.btnPrimary,
                                    ]}
                                    onPress={() => handlePress(btn)}
                                    activeOpacity={0.82}
                                >
                                    <Text style={[
                                        styles.btnText,
                                        isDestructive && styles.btnTextDestructive,
                                        isCancel && styles.btnTextCancel,
                                        !isDestructive && !isCancel && styles.btnTextPrimary,
                                    ]}>
                                        {btn.text}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </Animated.View>
            </View>
        </>
    );

    if (inline) {
        return (
            <View style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]} pointerEvents="box-none">
                {content}
            </View>
        );
    }

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            {content}
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(28, 26, 37, 0.55)',
    },
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    card: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#BEA3D8',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.25,
        shadowRadius: 40,
        elevation: 20,
    },
    iconBadge: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: '#F5F0FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconText: {
        fontSize: 26,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E1B2E',
        textAlign: 'center',
        letterSpacing: -0.4,
        marginBottom: 8,
    },
    message: {
        fontSize: 14,
        fontWeight: '400',
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    buttonsRow: {
        flexDirection: 'row',
        gap: 10,
        width: '100%',
    },
    buttonsStack: {
        flexDirection: 'column',
    },
    btn: {
        flex: 1,
        minHeight: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    btnFull: {
        flex: undefined,
        width: '100%',
    },
    btnPrimary: {
        backgroundColor: '#BEA3D8',
    },
    btnCancel: {
        backgroundColor: '#F5F0FF',
    },
    btnDestructive: {
        backgroundColor: '#FFF0EF',
        borderWidth: 1.5,
        borderColor: '#FECACA',
    },
    btnText: {
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'center',
    },
    btnTextPrimary: {
        color: '#FFFFFF',
    },
    btnTextCancel: {
        color: '#64748B',
    },
    btnTextDestructive: {
        color: '#DC2626',
    },
});
