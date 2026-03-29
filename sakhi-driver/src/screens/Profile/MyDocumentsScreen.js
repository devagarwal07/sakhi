import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';

const { width: SCREEN_W } = Dimensions.get('window');

const MOCK_DOCS = [
  {
    id: '1',
    type: 'driving_licence',
    title: 'Driving Licence',
    status: 'VERIFIED',
    iconName: 'card-account-details-outline',
    iconType: 'MaterialCommunity',
    expires: '12 Jun 2027',
    uploaded: '12 Jun 2022',
    colorKey: 'success',
  },
  {
    id: '2',
    type: 'vehicle_rc',
    title: 'Vehicle RC',
    status: 'EXPIRING SOON',
    iconName: 'swap-horizontal',
    iconType: 'MaterialCommunity',
    expires: '15 Oct 2026',
    uploaded: '20 Oct 2021',
    colorKey: 'warning',
  },
  {
    id: '3',
    type: 'insurance',
    title: 'Insurance Certificate',
    status: 'UNDER REVIEW',
    iconName: 'file-document-outline',
    iconType: 'MaterialCommunity',
    expires: '05 Jan 2026',
    uploaded: '10 Jan 2025',
    colorKey: 'primary',
  },
  {
    id: '4',
    type: 'aadhaar',
    title: 'Aadhaar Card',
    status: 'VERIFIED',
    iconName: 'badge-account-horizontal-outline',
    iconType: 'MaterialCommunity',
    colorKey: 'success',
  },
  {
    id: '5',
    type: 'profile_photo',
    title: 'Profile Photo',
    status: 'VERIFIED',
    isPhoto: true,
    colorKey: 'success',
  },
];

const COLORS = {
  success: {
    border: '#10B981',
    badgeBg: '#F0FDF4',
    badgeText: '#15803D',
    icon: 'check-circle',
  },
  warning: {
    border: '#F59E0B',
    badgeBg: '#FFF7ED',
    badgeText: '#C2410C',
    icon: 'alert-triangle',
  },
  primary: {
    border: '#BEA3D8',
    badgeBg: '#F5F3FF',
    badgeText: '#BEA3D8',
    icon: 'refresh-cw',
  },
};

export default function MyDocumentsScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const renderBadge = (status, colorKey) => {
    const theme = COLORS[colorKey];
    return (
      <View style={[styles.badgeContainer, { backgroundColor: theme.badgeBg }]}>
        <Text style={[styles.badgeText, { color: theme.badgeText }]}>{status}</Text>
        <Feather name={theme.icon} size={10} color={theme.badgeText} style={{ marginLeft: 4 }} />
      </View>
    );
  };

  const renderIconBox = (item) => {
    if (item.isPhoto) {
      return (
        <View style={styles.photoBox}>
          <Image
            source={{ uri: 'https://ui-avatars.com/api/?name=Driver&background=D4A373&color=fff' }}
            style={styles.profileAvatar}
          />
        </View>
      );
    }
    return (
      <View style={styles.iconBox}>
        {item.iconType === 'MaterialCommunity' ? (
          <MaterialCommunityIcons name={item.iconName} size={24} color="#BEA3D8" />
        ) : (
          <Feather name={item.iconName} size={24} color="#BEA3D8" />
        )}
      </View>
    );
  };

  return (
    <View style={styles.root}>
      {/* Absolute Navbar matching Figma Spec */}
      <View style={[styles.navBar, { top: Math.max(insets.top, 16) }]}>
        <TouchableOpacity
          style={styles.navIconButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color="#BEA3D8" />
        </TouchableOpacity>
        
        <Text style={styles.navTitle}>Documents</Text>

        <TouchableOpacity style={styles.navIconButton}>
          <View style={styles.helpIconCircle}>
            <Text style={styles.helpIconText}>?</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 16) + 60 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Section */}
        <View style={styles.headerTitleBox}>
          <Text style={styles.mainHeading}>My Documents</Text>
          <Text style={styles.subHeading}>
            Keep your documents updated to stay active on Sakhi.
          </Text>
        </View>

        {/* Warning Banner */}
        <View style={styles.warningBanner}>
          <View style={styles.warningIconWrapper}>
            <Feather name="alert-triangle" size={18} color="#EA580C" />
          </View>
          <Text style={styles.warningText}>
            1 document expiring soon. Please re-upload.
          </Text>
        </View>

        {/* Document List */}
        <View style={styles.docList}>
          {MOCK_DOCS.map((doc) => {
            const hasDetails = !!doc.expires || !!doc.uploaded;
            return (
              <View 
                key={doc.id} 
                style={[
                  styles.docCard, 
                  hasDetails ? styles.docCardLarge : styles.docCardSmall,
                  { borderLeftColor: COLORS[doc.colorKey]?.border || '#FFFFFF' }
                ]}
              >
                {renderIconBox(doc)}
                
                <View style={styles.docInfoCol}>
                  <View style={styles.docTopRow}>
                    <Text style={styles.docTitle}>{doc.title}</Text>
                    {renderBadge(doc.status, doc.colorKey)}
                  </View>

                  {hasDetails && (
                    <View style={styles.docDetailsBox}>
                      <Text style={styles.docMetaText}>Expires: {doc.expires}</Text>
                      <Text style={styles.docMetaText}>Uploaded: {doc.uploaded}</Text>
                      
                      <TouchableOpacity style={styles.reuploadBtn} activeOpacity={0.7}>
                        <Text style={styles.reuploadBtnText}>RE-UPLOAD</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Sticky Bottom Action Button */}
      <View style={[styles.bottomStickyArea, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <TouchableOpacity style={styles.uploadNewBtn} activeOpacity={0.8}>
          <Text style={styles.uploadNewText}>Upload New Document</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8F7FF',
  },

  // Navbar
  navBar: {
    position: 'absolute',
    left: 24,
    right: 24,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  navIconButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 20,
    color: '#111827',
  },
  helpIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#BEA3D8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpIconText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Inter',
  },

  // Main Scroll
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 120, // space for sticky button
  },

  headerTitleBox: {
    marginBottom: 24,
    gap: 8,
  },
  mainHeading: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 30,
    lineHeight: 36,
    color: '#0F172A',
  },
  subHeading: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 16,
    lineHeight: 26,
    color: '#64748B',
  },

  // Warning Banner
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    borderRadius: 8,
    padding: 16,
    gap: 12,
    marginBottom: 24,
  },
  warningIconWrapper: {
    paddingTop: 2,
  },
  warningText: {
    fontFamily: 'Inter',
    fontWeight: '500',
    fontSize: 14,
    lineHeight: 19,
    color: '#7C2D12',
    flex: 1,
  },

  // Document List
  docList: {
    gap: 16,
  },
  docCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderLeftWidth: 4,
    padding: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 20,
    elevation: 2,
    alignItems: 'flex-start',
  },
  docCardLarge: {
    minHeight: 126,
  },
  docCardSmall: {
    alignItems: 'center',
    minHeight: 80,
  },
  iconBox: {
    width: 48,
    height: 48,
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#EAEAEA',
  },
  profileAvatar: {
    width: '100%',
    height: '100%',
  },
  docInfoCol: {
    flex: 1,
    gap: 4,
  },
  docTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  docTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 18,
    lineHeight: 22,
    color: '#0F172A',
    flex: 1,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Details
  docDetailsBox: {
    marginTop: 2,
    gap: 2,
  },
  docMetaText: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 12,
    color: '#64748B',
  },
  reuploadBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  reuploadBtnText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 1.2,
    color: '#BEA3D8',
    textTransform: 'uppercase',
  },

  // Sticky Bottom Action
  bottomStickyArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: 'transparent', 
  },
  uploadNewBtn: {
    backgroundColor: '#BEA3D8',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 4,
  },
  uploadNewText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
