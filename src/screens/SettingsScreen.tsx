import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Alert,
    Platform,
    Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { RootStackParamList } from '../navigation/types';
import { COLORS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { getLatestChangelog } from '../utils/changelog';
import UpdateModal from '../components/UpdateModal';

interface SettingsScreenProps {
    onLogout: () => void;
}

export default function SettingsScreen({ onLogout }: SettingsScreenProps) {
    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
    const { theme, setTheme, colors, isDark } = useTheme();
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const handleCheckUpdate = async () => {
        try {
            Alert.alert('Đang kiểm tra...', 'Đang kết nối tới máy chủ cập nhật...');
            const update = await Updates.checkForUpdateAsync();
            if (update.isAvailable) {
                setShowUpdateModal(true);
            } else {
                Alert.alert('Đã cập nhật', 'Bạn đang sử dụng phiên bản mới nhất.');
            }
        } catch (error: any) {
            Alert.alert('Lỗi', `Không thể kiểm tra cập nhật: ${error.message}`);
        }
    };

    const handleDownloadUpdate = async () => {
        try {
            setIsDownloading(true);
            await Updates.fetchUpdateAsync();
            Alert.alert('Hoàn tất!', 'Ứng dụng sẽ khởi động lại ngay.', [
                { text: 'OK', onPress: () => Updates.reloadAsync() }
            ]);
        } catch (error: any) {
            Alert.alert('Lỗi', `Không thể tải bản cập nhật: ${error.message}`);
        } finally {
            setIsDownloading(false);
            setShowUpdateModal(false);
        }
    };

    const handleLogout = () => {
        Alert.alert(
            "Đăng xuất",
            "Bạn có chắc chắn muốn đăng xuất?",
            [
                { text: "Hủy", style: "cancel" },
                { text: "Đăng xuất", style: "destructive", onPress: onLogout }
            ]
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />

            {/* Header */}
            <LinearGradient
                colors={colors.headerGradient}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.header}
            >
                <SafeAreaView>
                    <View style={styles.headerContent}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Ionicons name="chevron-back" size={28} color={isDark ? '#FFF' : '#000'} />
                        </TouchableOpacity>
                        <Text style={[styles.headerTitle, { color: isDark ? '#FFF' : '#000' }]}>Cài đặt & Riêng tư</Text>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView style={[styles.content, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: 40 }}>

                {/* Edit Profile */}
                <TouchableOpacity
                    style={[styles.card, { backgroundColor: colors.card }]}
                    onPress={() => navigation.navigate('EditProfile')}
                >
                    <View style={styles.cardRow}>
                        <View style={styles.iconLabel}>
                            <View style={{
                                width: 32, height: 32, borderRadius: 8,
                                backgroundColor: isDark ? '#2D2D2D' : '#E0E7FF',
                                alignItems: 'center', justifyContent: 'center', marginRight: 12
                            }}>
                                <Ionicons name="person-circle-outline" size={20} color="#6366F1" />
                            </View>
                            <View>
                                <Text style={[styles.cardTitle, { color: colors.text }]}>Chỉnh sửa hồ sơ</Text>
                                <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Ảnh đại diện, tên, tiểu sử...</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </View>
                </TouchableOpacity>

                {/* Theme Selection */}
                <View style={[styles.sectionTitleContainer, { paddingHorizontal: 4, marginTop: 20 }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Giao diện</Text>
                </View>

                <View style={[styles.card, { backgroundColor: colors.card, shadowColor: isDark ? '#000' : '#000' }]}>
                    <TouchableOpacity
                        style={[styles.cardRow, { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 12 }]}
                        onPress={() => setTheme('light')}
                    >
                        <View style={styles.iconLabel}>
                            <Ionicons name="sunny-outline" size={22} color={colors.text} style={styles.cardIcon} />
                            <Text style={[styles.cardTitle, { color: colors.text }]}>Chế độ Sáng</Text>
                        </View>
                        {theme === 'light' && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.cardRow, { borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 12 }]}
                        onPress={() => setTheme('dark')}
                    >
                        <View style={styles.iconLabel}>
                            <Ionicons name="moon-outline" size={22} color={colors.text} style={styles.cardIcon} />
                            <Text style={[styles.cardTitle, { color: colors.text }]}>Chế độ Tối</Text>
                        </View>
                        {theme === 'dark' && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.cardRow, { paddingTop: 12 }]}
                        onPress={() => setTheme('system')}
                    >
                        <View style={styles.iconLabel}>
                            <Ionicons name="phone-portrait-outline" size={22} color={colors.text} style={styles.cardIcon} />
                            <Text style={[styles.cardTitle, { color: colors.text }]}>Theo hệ thống</Text>
                        </View>
                        {theme === 'system' && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}
                    </TouchableOpacity>
                </View>

                {/* Privacy & Security */}
                <View style={[styles.sectionTitleContainer, { paddingHorizontal: 4, marginTop: 20 }]}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Bảo mật & Riêng tư</Text>
                </View>

                <TouchableOpacity
                    style={[styles.card, { backgroundColor: colors.card }]}
                    onPress={() => navigation.navigate('PrivacySettings')}
                >
                    <View style={styles.cardRow}>
                        <View style={styles.iconLabel}>
                            <View style={{
                                width: 32, height: 32, borderRadius: 8,
                                backgroundColor: isDark ? '#2D2D2D' : '#E0F2FE',
                                alignItems: 'center', justifyContent: 'center', marginRight: 12
                            }}>
                                <Ionicons name="shield-checkmark" size={20} color="#0EA5E9" />
                            </View>
                            <View>
                                <Text style={[styles.cardTitle, { color: colors.text }]}>Quyền riêng tư & Bảo mật</Text>
                                <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Sinh trắc học, khóa ứng dụng, chặn...</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </View>
                </TouchableOpacity>

                {/* Change Password */}
                <TouchableOpacity
                    style={[styles.card, { marginTop: 12, backgroundColor: colors.card }]}
                    onPress={() => navigation.navigate('ChangePassword')}
                >
                    <View style={styles.cardRow}>
                        <View style={styles.iconLabel}>
                            <View style={{
                                width: 32, height: 32, borderRadius: 8,
                                backgroundColor: isDark ? '#2D2D2D' : '#FEF3C7',
                                alignItems: 'center', justifyContent: 'center', marginRight: 12
                            }}>
                                <Ionicons name="key-outline" size={20} color="#F59E0B" />
                            </View>
                            <View>
                                <Text style={[styles.cardTitle, { color: colors.text }]}>Đổi mật khẩu</Text>
                                <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>Thay đổi mật khẩu đăng nhập</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </View>
                </TouchableOpacity>

                {/* Feedback */}
                <TouchableOpacity
                    style={[styles.card, { marginTop: 12, backgroundColor: colors.card }]}
                    onPress={() => navigation.navigate('Feedback')}
                >
                    <View style={styles.cardRow}>
                        <View style={styles.iconLabel}>
                            <Ionicons name="chatbox-ellipses-outline" size={22} color={colors.text} style={styles.cardIcon} />
                            <Text style={[styles.cardTitle, { color: colors.text }]}>Gửi phản hồi</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </View>
                </TouchableOpacity>

                <Text style={[styles.supportText, { color: colors.textSecondary }]}>
                    Gửi phản hồi tới Quản trị hệ thống để <Text style={{ fontWeight: 'bold' }}>báo cáo sự cố</Text> hoặc góp ý cải tiến tính năng. Việc hỗ trợ xử lý sự cố sẽ được hiệu quả hơn. <Text style={{ fontWeight: 'bold' }}>Góp ý</Text> sẽ được ghi nhận để giúp Bạn có một phần mềm ngày càng tốt và hữu dụng hơn.
                </Text>

                {/* About Section */}
                <View style={[styles.aboutContainer, { backgroundColor: colors.card }]}>
                    <Text style={[styles.aboutTitle, { color: colors.text }]}>Giới thiệu về myZyea Next</Text>

                    <Text style={[styles.aboutText, { color: colors.text }]}>
                        <Text style={{ fontWeight: 'bold' }}>myZyea Next</Text> là một <Text style={{ fontWeight: 'bold' }}>SuperApp</Text> được thiết kế đặc biệt dành cho các doanh nghiệp vừa và lớn, giúp doanh nghiệp nâng cao trải nghiệm nhân viên với 5 giá trị cốt lõi: <Text style={{ fontStyle: 'italic' }}>Communication, Performance Management, Rewards, Personal Development</Text> và <Text style={{ fontStyle: 'italic' }}>Belonging</Text>, qua đó nâng cao năng suất làm việc, chất lượng công việc, xây dựng văn hóa doanh nghiệp và tăng cường sự gắn kết giữa các thành viên công ty.
                    </Text>

                    <Text style={[styles.aboutText, { marginTop: 12, color: colors.text }]}>
                        Hiện tại, phiên bản SuperApp <Text style={{ fontWeight: 'bold' }}>myZyea Next</Text> mà các Bạn đang sử dụng là phiên bản dành riêng cho Tập đoàn Zyea, gồm tính năng chính: <Text style={{ fontStyle: 'italic' }}>Tin tức, Việc của tôi, Payslip, Reward, Discipline, My Gold, Zyea Care, To-do Notes, QR Code, Learning, Survey...</Text> Các tính năng của <Text style={{ fontWeight: 'bold' }}>myZyea Next</Text> sẽ được tiếp tục cập nhật trong thời gian tới.
                    </Text>

                    <Text style={[styles.aboutText, { marginTop: 12, color: colors.text }]}>
                        Để SuperApp <Text style={{ fontWeight: 'bold' }}>myZyea Next</Text> sớm hoàn thiện, đội ngũ phát triển <Text style={{ fontWeight: 'bold' }}>myZyea Next</Text> mong Bạn sử dụng, trải nghiệm, góp ý, xây dựng để cùng đưa SuperApp <Text style={{ fontWeight: 'bold' }}>myZyea Next</Text> tiến nhanh, hoàn thành sứ mệnh là 1 Sản phẩm công nghệ lõi, 1 Massive Product của Zyea.
                    </Text>
                </View>

                {/* Logout Button */}
                <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.card }]} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={24} color="#EF4444" />
                    <Text style={styles.logoutText}>Đăng xuất</Text>
                </TouchableOpacity>

            </ScrollView>

            {/* Update Modal */}
            <UpdateModal
                visible={showUpdateModal}
                onUpdate={handleDownloadUpdate}
                onClose={() => setShowUpdateModal(false)}
                isDownloading={isDownloading}
            />
        </View>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        // backgroundColor handled inline with colors.background
    },
    header: {
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
        backgroundColor: 'transparent',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        paddingRight: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        // Shadow for iOS
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        // Shadow for Android
        elevation: 2,
    },
    cardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    iconLabel: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardIcon: {
        marginRight: 10,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
    },
    cardSubtitle: {
        fontSize: 12,
        color: '#999',
        marginTop: 2,
    },
    rightContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    valueText: {
        fontSize: 15,
        color: '#999',
        marginRight: 4,
    },
    supportText: {
        fontSize: 13,
        color: '#666',
        marginTop: 12,
        marginBottom: 20,
        lineHeight: 18,
    },
    aboutContainer: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    aboutTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#333',
    },
    aboutText: {
        fontSize: 14,
        color: '#444',
        lineHeight: 22,
        textAlign: 'justify',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    logoutText: {
        color: '#EF4444',
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 8,
    },
    sectionTitleContainer: {
        marginBottom: 8,
        marginTop: 4,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
});
