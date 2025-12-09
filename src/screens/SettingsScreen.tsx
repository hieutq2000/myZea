import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    StatusBar,
    Alert,
    Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { COLORS } from '../utils/theme';

interface SettingsScreenProps {
    onLogout: () => void;
}

export default function SettingsScreen({ onLogout }: SettingsScreenProps) {
    const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

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
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* Header */}
            <LinearGradient
                colors={['#ffebd9', '#e0f8ff']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.header}
            >
                <SafeAreaView>
                    <View style={styles.headerContent}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Ionicons name="chevron-back" size={28} color="#000" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Cài đặt</Text>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Language Setting */}
                <TouchableOpacity style={styles.card}>
                    <View style={styles.cardRow}>
                        <View style={styles.iconLabel}>
                            <Ionicons name="text-outline" size={22} color="#666" style={styles.cardIcon} />
                            <Text style={styles.cardTitle}>Cài đặt ngôn ngữ</Text>
                        </View>
                        <View style={styles.rightContent}>
                            <Text style={styles.valueText}>Ngôn ngữ thiết bị</Text>
                            <Ionicons name="chevron-forward" size={20} color="#999" />
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Feedback */}
                <TouchableOpacity style={[styles.card, { marginTop: 12 }]}>
                    <View style={styles.cardRow}>
                        <View style={styles.iconLabel}>
                            <Ionicons name="chatbox-ellipses-outline" size={22} color="#666" style={styles.cardIcon} />
                            <Text style={styles.cardTitle}>Gửi phản hồi</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#999" />
                    </View>
                </TouchableOpacity>

                <Text style={styles.supportText}>
                    Gửi phản hồi tới Quản trị hệ thống để <Text style={{ fontWeight: 'bold' }}>báo cáo sự cố</Text> hoặc góp ý cải tiến tính năng. Việc hỗ trợ xử lý sự cố sẽ được hiệu quả hơn. <Text style={{ fontWeight: 'bold' }}>Góp ý</Text> sẽ được ghi nhận để giúp Bạn có một phần mềm ngày càng tốt và hữu dụng hơn.
                </Text>

                {/* About Section */}
                <View style={styles.aboutContainer}>
                    <Text style={styles.aboutTitle}>Giới thiệu về myZyea Next</Text>

                    <Text style={styles.aboutText}>
                        <Text style={{ fontWeight: 'bold' }}>myZyea Next</Text> là một <Text style={{ fontWeight: 'bold' }}>SuperApp</Text> được thiết kế đặc biệt dành cho các doanh nghiệp vừa và lớn, giúp doanh nghiệp nâng cao trải nghiệm nhân viên với 5 giá trị cốt lõi: <Text style={{ fontStyle: 'italic' }}>Communication, Performance Management, Rewards, Personal Development</Text> và <Text style={{ fontStyle: 'italic' }}>Belonging</Text>, qua đó nâng cao năng suất làm việc, chất lượng công việc, xây dựng văn hóa doanh nghiệp và tăng cường sự gắn kết giữa các thành viên công ty.
                    </Text>

                    <Text style={[styles.aboutText, { marginTop: 12 }]}>
                        Hiện tại, phiên bản SuperApp <Text style={{ fontWeight: 'bold' }}>myZyea Next</Text> mà các Bạn đang sử dụng là phiên bản dành riêng cho Tập đoàn Zyea, gồm tính năng chính: <Text style={{ fontStyle: 'italic' }}>Tin tức, Việc của tôi, Payslip, Reward, Discipline, My Gold, Zyea Care, To-do Notes, QR Code, Learning, Survey...</Text> Các tính năng của <Text style={{ fontWeight: 'bold' }}>myZyea Next</Text> sẽ được tiếp tục cập nhật trong thời gian tới.
                    </Text>

                    <Text style={[styles.aboutText, { marginTop: 12 }]}>
                        Để SuperApp <Text style={{ fontWeight: 'bold' }}>myZyea Next</Text> sớm hoàn thiện, đội ngũ phát triển <Text style={{ fontWeight: 'bold' }}>myZyea Next</Text> mong Bạn sử dụng, trải nghiệm, góp ý, xây dựng để cùng đưa SuperApp <Text style={{ fontWeight: 'bold' }}>myZyea Next</Text> tiến nhanh, hoàn thành sứ mệnh là 1 Sản phẩm công nghệ lõi, 1 Massive Product của Zyea.
                    </Text>
                </View>

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={24} color="#EF4444" />
                    <Text style={styles.logoutText}>Đăng xuất</Text>
                </TouchableOpacity>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6', // Light gray background
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
});
