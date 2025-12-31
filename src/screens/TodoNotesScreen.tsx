import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    FlatList,
    Modal,
    Alert,
    Platform,
    KeyboardAvoidingView,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { useTheme } from '../context/ThemeContext';

interface TodoItem {
    id: string;
    title: string;
    description?: string;
    subtasks: { id: string; title: string; completed: boolean }[];
    completed: boolean;
    createdAt: string;
    reminderTime?: string; // ISO string for reminder
    notificationId?: string; // To cancel notification
    priority: 'low' | 'medium' | 'high';
}

export default function TodoNotesScreen() {
    const navigation = useNavigation();
    const { colors, isDark } = useTheme();
    const [todos, setTodos] = useState<TodoItem[]>([]);
    const [isModalVisible, setModalVisible] = useState(false);

    // New Todo Form State
    const [newTitle, setNewTitle] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newSubtasks, setNewSubtasks] = useState<string[]>([]);
    const [reminderDate, setReminderDate] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    useEffect(() => {
        loadTodos();
    }, []);

    const loadTodos = async () => {
        try {
            const stored = await AsyncStorage.getItem('todoNotes');
            if (stored) {
                setTodos(JSON.parse(stored));
            }
        } catch (e) {
            console.log('Error loading todos');
        }
    };

    const saveTodos = async (updatedTodos: TodoItem[]) => {
        try {
            await AsyncStorage.setItem('todoNotes', JSON.stringify(updatedTodos));
            setTodos(updatedTodos);
        } catch (e) {
            console.log('Error saving todos');
        }
    };

    const scheduleNotification = async (todo: TodoItem, reminderTime: Date): Promise<string | undefined> => {
        try {
            if (reminderTime <= new Date()) {
                return undefined; // Don't schedule past notifications
            }

            const notificationId = await Notifications.scheduleNotificationAsync({
                content: {
                    title: '📝 Nhắc việc cần làm',
                    body: todo.title,
                    sound: 'default',
                    data: { todoId: todo.id },
                },
                trigger: {
                    type: Notifications.SchedulableTriggerInputTypes.DATE,
                    date: reminderTime,
                },
            });
            return notificationId;
        } catch (e) {
            console.log('Error scheduling notification:', e);
            return undefined;
        }
    };

    const cancelNotification = async (notificationId: string) => {
        try {
            await Notifications.cancelScheduledNotificationAsync(notificationId);
        } catch (e) {
            console.log('Error canceling notification');
        }
    };

    const handleCreateTodo = async () => {
        if (!newTitle.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập tiêu đề ghi chú');
            return;
        }

        const newTodo: TodoItem = {
            id: `todo_${Date.now()}`,
            title: newTitle.trim(),
            description: newDescription.trim() || undefined,
            subtasks: newSubtasks.filter(s => s.trim()).map((s, i) => ({
                id: `subtask_${Date.now()}_${i}`,
                title: s.trim(),
                completed: false,
            })),
            completed: false,
            createdAt: new Date().toISOString(),
            reminderTime: reminderDate ? reminderDate.toISOString() : undefined,
            priority: 'medium',
        };

        // Schedule notification if reminder is set
        if (reminderDate) {
            const notificationId = await scheduleNotification(newTodo, reminderDate);
            newTodo.notificationId = notificationId;
        }

        saveTodos([newTodo, ...todos]);
        resetForm();
        setModalVisible(false);

        if (reminderDate) {
            Alert.alert('Thành công', `Đã tạo ghi chú với nhắc nhở lúc ${formatDateTime(reminderDate.toISOString())}`);
        } else {
            Alert.alert('Thành công', 'Đã tạo ghi chú mới');
        }
    };

    const resetForm = () => {
        setNewTitle('');
        setNewDescription('');
        setNewSubtasks([]);
        setReminderDate(null);
    };

    const toggleTodoComplete = async (todoId: string) => {
        const todo = todos.find(t => t.id === todoId);
        if (todo && todo.notificationId && !todo.completed) {
            // Cancel notification when completing
            await cancelNotification(todo.notificationId);
        }

        const updated = todos.map(todo =>
            todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
        );
        saveTodos(updated);
    };

    const deleteTodo = async (todoId: string) => {
        const todo = todos.find(t => t.id === todoId);

        Alert.alert(
            'Xóa ghi chú?',
            'Bạn có chắc muốn xóa ghi chú này?',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: async () => {
                        if (todo?.notificationId) {
                            await cancelNotification(todo.notificationId);
                        }
                        saveTodos(todos.filter(t => t.id !== todoId));
                    }
                }
            ]
        );
    };

    const formatDate = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    };

    const formatDateTime = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            const currentTime = reminderDate || new Date();
            selectedDate.setHours(currentTime.getHours(), currentTime.getMinutes());
            setReminderDate(selectedDate);
            // Show time picker after selecting date
            setTimeout(() => setShowTimePicker(true), 300);
        }
    };

    const handleTimeChange = (event: any, selectedTime?: Date) => {
        setShowTimePicker(false);
        if (selectedTime && reminderDate) {
            const newDate = new Date(reminderDate);
            newDate.setHours(selectedTime.getHours(), selectedTime.getMinutes());
            setReminderDate(newDate);
        }
    };

    const renderTodoItem = ({ item }: { item: TodoItem }) => {
        const completedSubtasks = item.subtasks.filter(s => s.completed).length;
        const totalSubtasks = item.subtasks.length;
        const hasReminder = item.reminderTime && new Date(item.reminderTime) > new Date();

        return (
            <TouchableOpacity
                style={[styles.todoCard, { backgroundColor: colors.card }]}
                onLongPress={() => deleteTodo(item.id)}
            >
                <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => toggleTodoComplete(item.id)}
                >
                    <Ionicons
                        name={item.completed ? 'checkbox' : 'square-outline'}
                        size={24}
                        color={item.completed ? '#10B981' : colors.textSecondary}
                    />
                </TouchableOpacity>

                <View style={styles.todoContent}>
                    <Text style={[
                        styles.todoTitle,
                        { color: colors.text },
                        item.completed && styles.completedText
                    ]}>
                        {item.title}
                    </Text>

                    {item.description && (
                        <Text style={[styles.todoDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                            {item.description}
                        </Text>
                    )}

                    {totalSubtasks > 0 && (
                        <View style={styles.subtaskProgress}>
                            <Ionicons name="list" size={14} color={colors.textSecondary} />
                            <Text style={[styles.subtaskText, { color: colors.textSecondary }]}>
                                {completedSubtasks}/{totalSubtasks} việc phụ
                            </Text>
                        </View>
                    )}

                    <View style={styles.metaRow}>
                        <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                            {formatDate(item.createdAt)}
                        </Text>

                        {hasReminder && (
                            <View style={styles.reminderBadge}>
                                <Ionicons name="alarm" size={12} color="#F97316" />
                                <Text style={styles.reminderText}>
                                    {formatDateTime(item.reminderTime!)}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const pendingTodos = todos.filter(t => !t.completed);
    const completedTodos = todos.filter(t => t.completed);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <LinearGradient
                colors={['#ffebd9', '#e0f8ff']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.headerGradient}
            >
                <SafeAreaView>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Ionicons name="chevron-back" size={28} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>To-do Notes</Text>
                        <TouchableOpacity onPress={() => setModalVisible(true)}>
                            <Ionicons name="add-circle" size={28} color="#F97316" />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </LinearGradient>

            {/* Todo List */}
            <FlatList
                data={pendingTodos}
                keyExtractor={item => item.id}
                renderItem={renderTodoItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="clipboard-outline" size={64} color={colors.textSecondary} />
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                            Chưa có ghi chú nào
                        </Text>
                        <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                            Bấm + để tạo ghi chú mới
                        </Text>
                    </View>
                }
                ListFooterComponent={
                    completedTodos.length > 0 ? (
                        <View style={styles.completedSection}>
                            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                                Đã hoàn thành ({completedTodos.length})
                            </Text>
                            {completedTodos.map(item => renderTodoItem({ item }))}
                        </View>
                    ) : null
                }
            />

            {/* Create Modal */}
            <Modal
                visible={isModalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        {/* Modal Header */}
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Tạo ghi chú cần làm</Text>
                            <View style={styles.modalActions}>
                                <TouchableOpacity style={{ marginRight: 16 }}>
                                    <Ionicons name="star-outline" size={24} color={colors.textSecondary} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => { resetForm(); setModalVisible(false); }}>
                                    <Ionicons name="close" size={24} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                            {/* Title Input */}
                            <TextInput
                                style={[styles.titleInput, { color: colors.text, borderBottomColor: colors.border }]}
                                placeholder="Ghi chú cần làm"
                                placeholderTextColor={colors.textSecondary}
                                value={newTitle}
                                onChangeText={setNewTitle}
                            />

                            {/* Description */}
                            <View style={styles.addRow}>
                                <Feather name="align-left" size={18} color={colors.textSecondary} />
                                <TextInput
                                    style={[styles.addRowText, { color: colors.text }]}
                                    placeholder="Thêm chi tiết"
                                    placeholderTextColor={colors.textSecondary}
                                    value={newDescription}
                                    onChangeText={setNewDescription}
                                    multiline
                                />
                            </View>

                            {/* Reminder */}
                            <TouchableOpacity
                                style={styles.addRow}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Ionicons name="alarm-outline" size={18} color={reminderDate ? '#F97316' : colors.textSecondary} />
                                <Text style={[styles.addRowText, { color: reminderDate ? '#F97316' : colors.textSecondary }]}>
                                    {reminderDate
                                        ? `Nhắc lúc ${formatDateTime(reminderDate.toISOString())}`
                                        : 'Đặt thời gian nhắc nhở'}
                                </Text>
                                {reminderDate && (
                                    <TouchableOpacity onPress={() => setReminderDate(null)}>
                                        <Ionicons name="close-circle" size={18} color="#EF4444" />
                                    </TouchableOpacity>
                                )}
                            </TouchableOpacity>

                            {/* Subtasks */}
                            <TouchableOpacity
                                style={styles.addRow}
                                onPress={() => setNewSubtasks([...newSubtasks, ''])}
                            >
                                <Feather name="list" size={18} color={colors.textSecondary} />
                                <Text style={[styles.addRowText, { color: colors.textSecondary }]}>
                                    Thêm việc phụ cần làm
                                </Text>
                            </TouchableOpacity>

                            {/* Subtask Inputs */}
                            {newSubtasks.map((subtask, index) => (
                                <View key={index} style={styles.subtaskInputRow}>
                                    <Ionicons name="square-outline" size={18} color={colors.textSecondary} />
                                    <TextInput
                                        style={[styles.subtaskInput, { color: colors.text, borderBottomColor: colors.border }]}
                                        placeholder={`Việc phụ ${index + 1}`}
                                        placeholderTextColor={colors.textSecondary}
                                        value={subtask}
                                        onChangeText={(text) => {
                                            const updated = [...newSubtasks];
                                            updated[index] = text;
                                            setNewSubtasks(updated);
                                        }}
                                    />
                                    <TouchableOpacity onPress={() => {
                                        setNewSubtasks(newSubtasks.filter((_, i) => i !== index));
                                    }}>
                                        <Ionicons name="close-circle" size={18} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>

                        {/* Bottom Actions */}
                        <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
                            <View style={styles.footerIcons}>
                                <TouchableOpacity style={styles.footerIcon}>
                                    <Ionicons name="person-add-outline" size={22} color={colors.textSecondary} />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.footerIcon}>
                                    <Ionicons name="people-outline" size={22} color={colors.textSecondary} />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.footerIcon}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Ionicons
                                        name="calendar-outline"
                                        size={22}
                                        color={reminderDate ? '#F97316' : colors.textSecondary}
                                    />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.footerIcon}>
                                    <Ionicons name="attach-outline" size={22} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity
                                style={[styles.createButton, !newTitle.trim() && { opacity: 0.5 }]}
                                onPress={handleCreateTodo}
                                disabled={!newTitle.trim()}
                            >
                                <Text style={styles.createButtonText}>Tạo</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Date/Time Picker Modal for iOS */}
            <Modal
                visible={showDatePicker || showTimePicker}
                transparent
                animationType="slide"
            >
                <View style={styles.pickerModalOverlay}>
                    <View style={[styles.pickerModalContent, { backgroundColor: colors.card }]}>
                        <View style={styles.pickerHeader}>
                            <TouchableOpacity onPress={() => { setShowDatePicker(false); setShowTimePicker(false); }}>
                                <Text style={{ color: '#EF4444', fontSize: 16 }}>Hủy</Text>
                            </TouchableOpacity>
                            <Text style={[styles.pickerTitle, { color: colors.text }]}>
                                {showDatePicker ? 'Chọn ngày' : 'Chọn giờ'}
                            </Text>
                            <TouchableOpacity onPress={() => {
                                if (showDatePicker) {
                                    setShowDatePicker(false);
                                    setTimeout(() => setShowTimePicker(true), 300);
                                } else {
                                    setShowTimePicker(false);
                                }
                            }}>
                                <Text style={{ color: '#F97316', fontSize: 16, fontWeight: '600' }}>
                                    {showDatePicker ? 'Tiếp' : 'Xong'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {showDatePicker && (
                            <DateTimePicker
                                value={reminderDate || new Date()}
                                mode="date"
                                display="spinner"
                                onChange={(event, date) => {
                                    if (date) {
                                        const newDate = new Date(date);
                                        if (reminderDate) {
                                            newDate.setHours(reminderDate.getHours(), reminderDate.getMinutes());
                                        }
                                        setReminderDate(newDate);
                                    }
                                }}
                                minimumDate={new Date()}
                                style={{ height: 200 }}
                            />
                        )}

                        {showTimePicker && (
                            <DateTimePicker
                                value={reminderDate || new Date()}
                                mode="time"
                                display="spinner"
                                onChange={(event, time) => {
                                    if (time && reminderDate) {
                                        const newDate = new Date(reminderDate);
                                        newDate.setHours(time.getHours(), time.getMinutes());
                                        setReminderDate(newDate);
                                    }
                                }}
                                style={{ height: 200 }}
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerGradient: {
        paddingBottom: 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        marginRight: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        flex: 1,
        textAlign: 'center',
    },
    listContent: {
        padding: 16,
        paddingBottom: 100,
    },
    todoCard: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    checkbox: {
        marginRight: 12,
    },
    todoContent: {
        flex: 1,
    },
    todoTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    completedText: {
        textDecorationLine: 'line-through',
        opacity: 0.6,
    },
    todoDescription: {
        fontSize: 14,
        marginBottom: 8,
    },
    subtaskProgress: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    subtaskText: {
        fontSize: 12,
        marginLeft: 4,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dateText: {
        fontSize: 11,
    },
    reminderBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF7ED',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    reminderText: {
        fontSize: 10,
        color: '#F97316',
        marginLeft: 4,
        fontWeight: '500',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        marginTop: 4,
    },
    completedSection: {
        marginTop: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '600',
    },
    modalActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    modalBody: {
        padding: 16,
        maxHeight: 400,
    },
    titleInput: {
        fontSize: 18,
        fontWeight: '500',
        paddingVertical: 12,
        borderBottomWidth: 1,
        marginBottom: 16,
    },
    addRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    addRowText: {
        fontSize: 15,
        marginLeft: 12,
        flex: 1,
    },
    subtaskInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        marginLeft: 30,
    },
    subtaskInput: {
        flex: 1,
        fontSize: 14,
        marginLeft: 8,
        paddingVertical: 4,
        borderBottomWidth: 1,
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderTopWidth: 1,
    },
    footerIcons: {
        flexDirection: 'row',
    },
    footerIcon: {
        marginRight: 20,
    },
    createButton: {
        backgroundColor: '#F97316',
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 8,
    },
    createButtonText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 15,
    },
    pickerModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    pickerModalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 40,
    },
    pickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    pickerTitle: {
        fontSize: 17,
        fontWeight: '600',
    },
});
