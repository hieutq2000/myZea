import React, { useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Text, SafeAreaView, ActivityIndicator, Share } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

interface InAppBrowserProps {
    visible: boolean;
    url: string | null;
    onClose: () => void;
}

const InAppBrowser: React.FC<InAppBrowserProps> = ({ visible, url, onClose }) => {
    const [title, setTitle] = useState('Đang tải...');
    const [canGoBack, setCanGoBack] = useState(false);
    const [canGoForward, setCanGoForward] = useState(false);
    const webViewRef = React.useRef<WebView>(null);

    if (!url) return null;

    const handleShare = async () => {
        try {
            await Share.share({
                message: url,
                url: url, // iOS
            });
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Text style={styles.closeText}>Xong</Text>
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
                        <Text style={styles.headerUrl} numberOfLines={1}>{url}</Text>
                    </View>
                    <TouchableOpacity onPress={() => webViewRef.current?.reload()} style={styles.reloadButton}>
                        <Ionicons name="refresh" size={20} color="#333" />
                    </TouchableOpacity>
                </View>

                <WebView
                    ref={webViewRef}
                    source={{ uri: url }}
                    style={styles.webview}
                    onNavigationStateChange={(navState) => {
                        setCanGoBack(navState.canGoBack);
                        setCanGoForward(navState.canGoForward);
                        if (navState.title) setTitle(navState.title);
                    }}
                    startInLoadingState={true}
                    renderLoading={() => (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#0068FF" />
                        </View>
                    )}
                    // iOS specific: allow swipe back navigation
                    allowsBackForwardNavigationGestures={true}
                    onError={(syntheticEvent) => {
                        const { nativeEvent } = syntheticEvent;
                        console.warn('WebView error: ', nativeEvent);
                    }}
                />

                <View style={styles.footer}>
                    <TouchableOpacity disabled={!canGoBack} onPress={() => webViewRef.current?.goBack()}>
                        <Ionicons name="chevron-back" size={24} color={canGoBack ? "#333" : "#CCC"} />
                    </TouchableOpacity>
                    <TouchableOpacity disabled={!canGoForward} onPress={() => webViewRef.current?.goForward()}>
                        <Ionicons name="chevron-forward" size={24} color={canGoForward ? "#333" : "#CCC"} />
                    </TouchableOpacity>
                    <View style={{ width: 24 }} />
                    <TouchableOpacity onPress={handleShare}>
                        <Ionicons name="share-outline" size={24} color="#333" />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
        backgroundColor: '#FFF',
    },
    closeButton: {
        padding: 5,
        minWidth: 40,
    },
    closeText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0068FF',
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 10,
    },
    headerTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#000',
    },
    headerUrl: {
        fontSize: 11,
        color: '#666',
        marginTop: 2,
    },
    reloadButton: {
        padding: 5,
        minWidth: 40,
        alignItems: 'flex-end',
    },
    webview: {
        flex: 1,
    },
    loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        paddingHorizontal: 30,
        borderTopWidth: 1,
        borderTopColor: '#EEE',
        backgroundColor: '#FFF',
        paddingBottom: 20, // Add padding for iOS home indicator if needed
    }
});

export default InAppBrowser;
