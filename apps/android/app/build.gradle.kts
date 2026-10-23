plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

val linkaVersionCode = providers.gradleProperty("linkaVersionCode").orNull?.toIntOrNull() ?: 5
val linkaVersionName = providers.gradleProperty("linkaVersionName").orNull ?: "0.4.0"
val linkaSupabaseUrl = (System.getenv("LINKA_SUPABASE_URL")?.takeIf { it.isNotBlank() } ?: "${projectUrl}").replace("\\", "\\\\").replace("\"", "\\\"")
val linkaSupabaseKey = (System.getenv("LINKA_SUPABASE_PUBLISHABLE_KEY")?.takeIf { it.isNotBlank() } ?: "sb_publishable_MZT9UvH4uKukY3KpBQr3wQ_9HIP9xJB").replace("\\", "\\\\").replace("\"", "\\\"")

android {
    namespace = "app.linka.android"
    compileSdk = 35

    defaultConfig {
        buildConfigField("String", "LINKA_SUPABASE_URL", "\"$linkaSupabaseUrl\"")
        buildConfigField("String", "LINKA_SUPABASE_PUBLISHABLE_KEY", "\"$linkaSupabaseKey\"")
        applicationId = "app.linka.android.next"
        minSdk = 26
        targetSdk = 35
        versionCode = linkaVersionCode
        versionName = linkaVersionName
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures { compose = true; buildConfig = true }

    signingConfigs {
        create("linkaCi") {
            storeFile = file("${System.getProperty("user.home")}/.android/debug.keystore")
            storePassword = "android"
            keyAlias = "androiddebugkey"
            keyPassword = "android"
        }
    }

    buildTypes {
        getByName("release") {
            // Explicitly use the keystore generated and persisted by the Android CI workflow.
            signingConfig = signingConfigs.getByName("linkaCi")
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2024.12.01"))
    implementation("androidx.activity:activity-compose:1.10.0")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("io.coil-kt:coil-compose:2.7.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("androidx.work:work-runtime-ktx:2.10.0")
    debugImplementation("androidx.compose.ui:ui-tooling")
    testImplementation("junit:junit:4.13.2")
}