// ثوابت التحقق من الجهاز المشتركة بين الخادم والمتصفح (lib/deviceTrust للخادم بس)
export const DEVICE_UNVERIFIED_REASON = 'device_unverified'
export const DEVICE_UNVERIFIED_ERROR = 'هذا الجهاز يحتاج رمز تحقق — أدخل الرمز اللي يوصلك على الإيميل'
export const VERIFY_DEVICE_PATH = '/verify-device'
// تطبيق الجوال ما ينقل الكوكيز بين الدومينات — يحفظ معرّف الجهاز هنا ويرسله بهيدر
export const DEVICE_STORAGE_KEY = 'storely_device'
