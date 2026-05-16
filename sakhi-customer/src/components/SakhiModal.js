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

export default function SakhiModal({ config, onClose }) {
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

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
            statusBarTranslucent
        >
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
                                <Feather name="gift" size={26} color="#BEA3D8" />
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
                                <Feather name="clock" size={26} color="#BEA3D8" />
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
