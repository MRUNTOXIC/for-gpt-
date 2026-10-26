# Uncle Ledger

Uncle Ledger is a simple, offline-first native Android app for tracking everyday money entries. It uses **Kotlin + Jetpack Compose** and targets Android 8.0+ (API 26+), including the Samsung Galaxy Z Fold 6.

## Included
- Large Credit and Debit actions
- Cash, Online and Baaki entry types
- Ledger balance and separate pending Baaki totals (to collect / to pay)
- Transaction history, deletion confirmation and mark-as-settled action for Baaki entries
- Local-only storage on the phone; no account login or bank API
- Optional UPI ID and payee fields so a debit can open a UPI payment with amount/payee/note prefilled when supported
- Shareable Baaki reminder text using Android's share sheet (WhatsApp can be selected)
- Responsive layout for narrow and unfolded Fold screens

## Important payment notes
The app never makes payments silently. GPay/UPI must display the payment and the user must authorize it. UPI apps may handle or reject prefilled parameters according to their own rules. WhatsApp is opened through Android sharing; the app does not send messages automatically.

## Build
Use JDK 17 and Gradle 8.9 or later compatible with Android Gradle Plugin 8.7.3. A GitHub Actions workflow is provided in `.github/workflows/build-uncle-ledger.yml` at the bundle root so you can build a debug APK in the cloud without Android Studio installed locally.
