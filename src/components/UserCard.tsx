import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';

interface UserCardProps {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    company: string;
    role: string;
    photo: string;
  };
  onEdit?: () => void;
}

export const UserCard: React.FC<UserCardProps> = ({ user, onEdit }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onEdit} disabled={!onEdit}>
      <Image source={{ uri: user.photo }} style={styles.photo} />
      <View style={styles.info}>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.role}>{user.role} - {user.company}</Text>
        <Text style={styles.detail}>{user.email}</Text>
        <Text style={styles.detail}>{user.phone}</Text>
      </View>
      {onEdit && (
        <View style={styles.editBtn}>
          <Text style={styles.editBtnText}>✎</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
  },
  photo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  role: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
    marginBottom: 4,
  },
  detail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  editBtn: {
    padding: 8,
  },
  editBtnText: {
    fontSize: 20,
    color: colors.primaryLight,
  }
});
