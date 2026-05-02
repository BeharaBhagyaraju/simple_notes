import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Platform,
} from 'react-native';
import { useTheme } from '../utils/ThemeContext';

const CustomPicker = ({ selectedValue, onValueChange, options, style }) => {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);

  const selectedOption = options.find(o => o.value === selectedValue);

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[styles.trigger, { backgroundColor: 'transparent' }]}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.triggerText, { color: colors.textPrimary }]} numberOfLines={1}>
          {selectedOption?.label || 'Select...'}
        </Text>
        <Text style={[styles.arrow, { color: colors.textMuted }]}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={[styles.overlay, { backgroundColor: colors.overlay }]}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={[styles.dropdown, { backgroundColor: colors.modalBg, borderColor: colors.borderAccent }]}>
            <View style={[styles.dropdownHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.dropdownTitle, { color: colors.textPrimary }]}>Select Option</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Text style={[styles.closeBtn, { color: colors.textMuted }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => {
                const isSelected = item.value === selectedValue;
                return (
                  <TouchableOpacity
                    style={[
                      styles.option,
                      { borderBottomColor: colors.border },
                      isSelected && { backgroundColor: colors.primaryBg },
                    ]}
                    onPress={() => {
                      onValueChange(item.value);
                      setVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        { color: isSelected ? colors.primary : colors.textPrimary },
                        isSelected && { fontWeight: 'bold' },
                      ]}
                    >
                      {item.label}
                    </Text>
                    {isSelected && (
                      <Text style={{ color: colors.primary, fontSize: 16 }}>✓</Text>
                    )}
                  </TouchableOpacity>
                );
              }}
              style={styles.list}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 40,
  },
  triggerText: {
    fontSize: 13,
    flex: 1,
  },
  arrow: {
    fontSize: 10,
    marginLeft: 4,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  dropdown: {
    width: '100%',
    maxWidth: 340,
    maxHeight: 400,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeBtn: {
    fontSize: 18,
    padding: 4,
  },
  list: {
    flexGrow: 0,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
  },
  optionText: {
    fontSize: 15,
    flex: 1,
  },
});

export default CustomPicker;
