import React, { useState } from 'react';
import { Text, TouchableOpacity, StyleSheet, TextStyle } from 'react-native';

interface TextWithSeeMoreProps {
    text: string;
    onLinkPress?: (url: string) => void;
    style?: TextStyle;
}

const TextWithSeeMore: React.FC<TextWithSeeMoreProps> = ({ text, onLinkPress, style }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const maxLength = 150;

    if (!text) return null;

    const renderTextWithLinks = (content: string) => {
        const parts = content.split(/(https?:\/\/[^\s]+)/g);
        return parts.map((part, index) => {
            if (part.match(/https?:\/\/[^\s]+/)) {
                return (
                    <Text
                        key={index}
                        style={{ color: '#0068FF', textDecorationLine: 'underline' }}
                        onPress={(e) => {
                            e.stopPropagation();
                            if (onLinkPress) onLinkPress(part);
                        }}
                    >
                        {part}
                    </Text>
                );
            }
            return <Text key={index}>{part}</Text>;
        });
    };

    if (text.length <= maxLength) {
        return (
            <Text style={[styles.text, style]}>
                {renderTextWithLinks(text)}
            </Text>
        );
    }

    const displayedText = isExpanded ? text : `${text.substring(0, maxLength)}...`;

    return (
        <TouchableOpacity activeOpacity={0.8} onPress={() => setIsExpanded(!isExpanded)}>
            <Text style={[styles.text, style]}>
                {renderTextWithLinks(displayedText)}
            </Text>
            <Text style={styles.seeMoreText}>
                {isExpanded ? 'Thu gọn' : 'Xem thêm'}
            </Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    text: {
        fontSize: 15,
        color: '#333',
        lineHeight: 22,
    },
    seeMoreText: {
        color: '#666',
        marginTop: 4,
        fontSize: 13,
        fontWeight: '500',
    }
});

export default TextWithSeeMore;
