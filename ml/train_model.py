"""
HIA NEXUS - Insurance Recommendation ML Model
Trained on MEPS (Medical Expenditure Panel Survey) inspired dataset
with realistic medical profiles and insurance outcomes.

Run: python ml/train_model.py
Install: pip install xgboost scikit-learn pandas numpy joblib
"""

import numpy as np
import pandas as pd
import json
import os

try:
    import xgboost as xgb
    import joblib
    from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
    from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
    from sklearn.preprocessing import LabelEncoder
    HAS_DEPS = True
except ImportError:
    HAS_DEPS = False
    print("Run: pip install xgboost scikit-learn pandas numpy joblib")

PLAN_LABELS = [
    'nexus-basic',
    'nexus-plus',
    'nexus-premium',
    'nexus-elite',
    'nexus-family',
    'nexus-family-complete',
    'nexus-chronic',
    'nexus-hsa',
]

# Real-world medical condition categories from ICD-10
CHRONIC_CONDITIONS = [
    'type2_diabetes', 'hypertension', 'coronary_artery_disease',
    'copd', 'asthma', 'chronic_kidney_disease', 'heart_failure',
    'rheumatoid_arthritis', 'lupus', 'multiple_sclerosis',
    'parkinsons', 'epilepsy', 'crohns_disease', 'ulcerative_colitis',
]

ACUTE_CONDITIONS = [
    'seasonal_allergies', 'migraines', 'anxiety', 'depression',
    'hypothyroidism', 'hyperthyroidism', 'anemia', 'gerd',
    'sleep_apnea', 'obesity', 'back_pain', 'osteoporosis',
]

CANCER_HISTORY = [
    'breast_cancer', 'prostate_cancer', 'colon_cancer',
    'skin_cancer', 'lung_cancer', 'lymphoma',
]


def assign_optimal_plan(profile: dict) -> str:
    """
    Evidence-based plan assignment mimicking real insurance underwriting logic.
    Based on MEPS data patterns and ACA actuarial guidelines.
    """
    scores = {p: 0.0 for p in PLAN_LABELS}

    age = profile['age']
    income_k = profile['income_k']
    n_chronic = profile['n_chronic_conditions']
    n_medications = profile['n_medications']
    has_cancer = profile['has_cancer_history']
    has_dependents = profile['has_dependents']
    n_dependents = profile['n_dependents']
    annual_visits = profile['annual_doctor_visits']
    bmi = profile['bmi']
    smoker = profile['smoker']
    wants_hsa = profile['wants_hsa']
    planned_surgery = profile['planned_surgery_12mo']
    mental_health_dx = profile['mental_health_diagnosis']
    prefers_low_deductible = profile['prefers_low_deductible']  # 1-10
    budget_monthly = profile['budget_monthly_usd']

    # ── Budget hard filters ──────────────────────────────────────────────────
    if budget_monthly < 220:
        scores['nexus-basic'] += 40
        scores['nexus-hsa'] += 30
        scores['nexus-plus'] -= 20
        scores['nexus-premium'] -= 40
        scores['nexus-elite'] -= 60
    elif budget_monthly < 400:
        scores['nexus-basic'] += 15
        scores['nexus-hsa'] += 20
        scores['nexus-plus'] += 25
    elif budget_monthly < 600:
        scores['nexus-plus'] += 20
        scores['nexus-premium'] += 30
        scores['nexus-chronic'] += 10
    else:
        scores['nexus-premium'] += 20
        scores['nexus-elite'] += 35

    # ── Family status ────────────────────────────────────────────────────────
    if has_dependents and n_dependents >= 3:
        scores['nexus-family-complete'] += 45
        scores['nexus-family'] += 30
        scores['nexus-basic'] -= 30
        scores['nexus-hsa'] -= 20
    elif has_dependents and n_dependents >= 1:
        scores['nexus-family'] += 40
        scores['nexus-plus'] += 15
        scores['nexus-basic'] -= 15

    # ── Chronic conditions ────────────────────────────────────────────────────
    if n_chronic >= 3 or has_cancer:
        scores['nexus-chronic'] += 50
        scores['nexus-elite'] += 30
        scores['nexus-premium'] += 20
        scores['nexus-basic'] -= 40
        scores['nexus-hsa'] -= 35
    elif n_chronic == 2:
        scores['nexus-chronic'] += 25
        scores['nexus-premium'] += 30
        scores['nexus-plus'] += 15
        scores['nexus-basic'] -= 20
    elif n_chronic == 1:
        scores['nexus-plus'] += 20
        scores['nexus-premium'] += 15

    # ── Medication burden ────────────────────────────────────────────────────
    if n_medications >= 5:
        scores['nexus-chronic'] += 25
        scores['nexus-premium'] += 20
        scores['nexus-elite'] += 15
        scores['nexus-hsa'] -= 25
    elif n_medications >= 3:
        scores['nexus-plus'] += 15
        scores['nexus-premium'] += 20

    # ── Planned surgery ──────────────────────────────────────────────────────
    if planned_surgery:
        scores['nexus-premium'] += 35
        scores['nexus-elite'] += 30
        scores['nexus-basic'] -= 35
        scores['nexus-hsa'] -= 20

    # ── Age-based risk ───────────────────────────────────────────────────────
    if age < 26:
        scores['nexus-basic'] += 25
        scores['nexus-hsa'] += 30
        scores['nexus-elite'] -= 20
    elif age < 35:
        scores['nexus-hsa'] += 20
        scores['nexus-basic'] += 10
        scores['nexus-plus'] += 10
    elif age < 50:
        scores['nexus-plus'] += 15
        scores['nexus-premium'] += 10
    elif age < 65:
        scores['nexus-premium'] += 25
        scores['nexus-chronic'] += 15
        scores['nexus-basic'] -= 15
    else:
        scores['nexus-elite'] += 25
        scores['nexus-premium'] += 20
        scores['nexus-chronic'] += 20
        scores['nexus-basic'] -= 30

    # ── Annual visit frequency ────────────────────────────────────────────────
    if annual_visits >= 12:
        scores['nexus-premium'] += 20
        scores['nexus-elite'] += 15
        scores['nexus-basic'] -= 25
    elif annual_visits >= 6:
        scores['nexus-plus'] += 15
        scores['nexus-premium'] += 10
    elif annual_visits <= 2:
        scores['nexus-hsa'] += 25
        scores['nexus-basic'] += 15

    # ── BMI / smoker risk ────────────────────────────────────────────────────
    if bmi >= 35 or smoker:
        scores['nexus-premium'] += 15
        scores['nexus-chronic'] += 10
        scores['nexus-hsa'] -= 10

    # ── Mental health ─────────────────────────────────────────────────────────
    if mental_health_dx:
        scores['nexus-plus'] += 15
        scores['nexus-premium'] += 10
        scores['nexus-basic'] -= 10

    # ── HSA preference ────────────────────────────────────────────────────────
    if wants_hsa and n_chronic == 0 and age < 55:
        scores['nexus-hsa'] += 40

    # ── Low deductible preference (scale 1-10) ────────────────────────────────
    if prefers_low_deductible >= 8:
        scores['nexus-elite'] += 20
        scores['nexus-premium'] += 15
        scores['nexus-hsa'] -= 25
        scores['nexus-basic'] -= 15
    elif prefers_low_deductible <= 3:
        scores['nexus-hsa'] += 20
        scores['nexus-basic'] += 10

    # ── Income-based affordability ────────────────────────────────────────────
    if income_k < 30:
        scores['nexus-basic'] += 20
        scores['nexus-elite'] -= 30
    elif income_k > 100:
        scores['nexus-elite'] += 15
        scores['nexus-premium'] += 10

    # Add calibrated noise
    for k in scores:
        scores[k] += np.random.normal(0, 4)

    return max(scores, key=scores.get)


def generate_realistic_dataset(n: int = 8000, seed: int = 42) -> pd.DataFrame:
    np.random.seed(seed)
    records = []

    # Demographic distributions matching US Census / MEPS data
    age_weights = np.array([0.08, 0.12, 0.15, 0.18, 0.17, 0.15, 0.10, 0.05])
    age_bins = [18, 25, 35, 45, 55, 65, 72, 80, 90]

    for _ in range(n):
        # Age
        age_bin = np.random.choice(len(age_weights), p=age_weights)
        age = int(np.random.uniform(age_bins[age_bin], age_bins[age_bin + 1]))

        # Income (log-normal, median ~$65k)
        income_k = round(float(np.random.lognormal(10.9, 0.7)) / 1000, 1)
        income_k = min(max(income_k, 18), 400)

        # BMI (slightly right-skewed, US population)
        bmi = round(float(np.clip(np.random.normal(28.5, 6.2), 16, 55)), 1)

        # Smoking prevalence (CDC: ~14% of US adults)
        smoker = bool(np.random.random() < 0.14)

        # Chronic conditions increase with age
        base_chronic_prob = min(0.05 + (age - 18) * 0.008, 0.70)
        n_chronic = int(np.clip(np.random.poisson(base_chronic_prob * 2.5), 0, 6))

        # Cancer history
        has_cancer = bool(n_chronic >= 2 and np.random.random() < 0.12)

        # Medications scale with conditions
        n_medications = int(np.clip(np.random.poisson(max(0.5, n_chronic * 1.8 + 0.5)), 0, 12))

        # Doctor visits
        base_visits = max(1, n_chronic * 3 + np.random.poisson(2))
        annual_visits = int(min(base_visits + np.random.poisson(1), 30))

        # Family status
        has_dependents = bool(np.random.random() < (0.45 if 25 <= age <= 55 else 0.15))
        n_dependents = int(np.clip(np.random.poisson(1.8), 1, 5)) if has_dependents else 0

        # Mental health (SAMHSA: ~21% of US adults)
        mental_health_dx = bool(np.random.random() < 0.21)

        # Planned surgery
        planned_surgery = bool(np.random.random() < (0.08 + n_chronic * 0.05))

        # HSA preference (income and age correlated)
        wants_hsa = bool(income_k > 60 and age < 55 and np.random.random() < 0.35)

        # Deductible preference
        prefers_low_deductible = int(np.random.choice(
            range(1, 11),
            p=[0.04, 0.06, 0.08, 0.10, 0.12, 0.12, 0.14, 0.14, 0.12, 0.08]
        ))

        # Budget (correlated with income)
        budget_base = income_k * 0.045 * (1 + np.random.normal(0, 0.3))
        budget_monthly = int(max(100, min(budget_base, 1500)))

        # Specialist access preference
        prefers_ppo = bool(np.random.random() < (0.55 if income_k > 50 else 0.35))

        profile = {
            'age': age,
            'income_k': income_k,
            'bmi': bmi,
            'smoker': int(smoker),
            'n_chronic_conditions': n_chronic,
            'has_cancer_history': int(has_cancer),
            'n_medications': n_medications,
            'annual_doctor_visits': annual_visits,
            'has_dependents': int(has_dependents),
            'n_dependents': n_dependents,
            'mental_health_diagnosis': int(mental_health_dx),
            'planned_surgery_12mo': int(planned_surgery),
            'wants_hsa': int(wants_hsa),
            'prefers_low_deductible': prefers_low_deductible,
            'budget_monthly_usd': budget_monthly,
            'prefers_ppo': int(prefers_ppo),
        }

        profile['label'] = assign_optimal_plan(profile)
        records.append(profile)

    df = pd.DataFrame(records)

    # Feature engineering
    df['age_chronic_interaction'] = df['age'] * df['n_chronic_conditions']
    df['meds_per_condition'] = df['n_medications'] / (df['n_chronic_conditions'] + 1)
    df['visits_per_condition'] = df['annual_doctor_visits'] / (df['n_chronic_conditions'] + 1)
    df['income_to_budget_ratio'] = df['budget_monthly_usd'] / (df['income_k'] + 1)
    df['high_risk'] = ((df['n_chronic_conditions'] >= 2) | (df['has_cancer_history'] == 1)).astype(int)
    df['family_size'] = df['n_dependents'] + 1

    return df


def train():
    if not HAS_DEPS:
        print("Missing deps. Run: pip install xgboost scikit-learn pandas numpy joblib")
        return

    print("=" * 60)
    print("HIA NEXUS — Insurance Recommendation Model Training")
    print("=" * 60)

    print("\nGenerating MEPS-inspired dataset (n=8,000)...")
    df = generate_realistic_dataset(8000)

    dist = df['label'].value_counts()
    print(f"\nDataset distribution:")
    for plan, count in dist.items():
        bar = '█' * (count // 50)
        print(f"  {plan:30s} {bar} {count}")

    le = LabelEncoder()
    df['label_enc'] = le.fit_transform(df['label'])

    feature_cols = [c for c in df.columns if c not in ['label', 'label_enc']]
    X = df[feature_cols]
    y = df['label_enc']

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print(f"\nTraining XGBoost on {len(X_train)} samples...")
    model = xgb.XGBClassifier(
        n_estimators=500,
        max_depth=7,
        learning_rate=0.08,
        subsample=0.85,
        colsample_bytree=0.85,
        min_child_weight=3,
        gamma=0.1,
        reg_alpha=0.1,
        reg_lambda=1.0,
        use_label_encoder=False,
        eval_metric='mlogloss',
        random_state=42,
        n_jobs=-1,
        early_stopping_rounds=30,
    )

    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=50,
    )

    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)

    print(f"\n{'='*60}")
    print(f"Test Accuracy: {acc:.4f} ({acc*100:.1f}%)")
    print(f"{'='*60}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=le.classes_))

    # Cross-validation
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_model = xgb.XGBClassifier(
        n_estimators=model.best_iteration,
        max_depth=7, learning_rate=0.08,
        subsample=0.85, colsample_bytree=0.85,
        use_label_encoder=False, eval_metric='mlogloss',
        random_state=42, n_jobs=-1,
    )
    cv_scores = cross_val_score(cv_model, X, y, cv=cv, scoring='accuracy')
    print(f"\n5-Fold CV Accuracy: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    # Feature importance
    fi = dict(zip(feature_cols, model.feature_importances_))
    top_features = sorted(fi.items(), key=lambda x: x[1], reverse=True)[:12]
    print("\nTop 12 Feature Importances:")
    for feat, imp in top_features:
        bar = '█' * int(imp * 200)
        print(f"  {feat:35s} {bar} {imp:.4f}")

    os.makedirs('ml', exist_ok=True)
    joblib.dump(model, 'ml/insurance_model.pkl')
    joblib.dump(le, 'ml/label_encoder.pkl')
    joblib.dump(feature_cols, 'ml/feature_cols.pkl')

    meta = {
        'accuracy': round(float(acc), 4),
        'cv_accuracy_mean': round(float(cv_scores.mean()), 4),
        'cv_accuracy_std': round(float(cv_scores.std()), 4),
        'n_samples': len(df),
        'best_iteration': int(model.best_iteration),
        'features': feature_cols,
        'plans': list(le.classes_),
        'dataset': 'MEPS-inspired synthetic (n=8000)',
        'model': 'XGBoost with early stopping',
    }
    with open('ml/model_meta.json', 'w') as f:
        json.dump(meta, f, indent=2)

    print(f"\n✅ Model saved → ml/insurance_model.pkl")
    print(f"✅ Metadata  → ml/model_meta.json")
    print(f"\nBest iteration: {model.best_iteration}")
    print("Training complete!")
    return model, le, feature_cols


def predict_plan(patient_features: dict) -> dict:
    """Predict plan probabilities for a patient profile dict."""
    model = joblib.load('ml/insurance_model.pkl')
    le = joblib.load('ml/label_encoder.pkl')
    feature_cols = joblib.load('ml/feature_cols.pkl')

    # Fill missing features with 0
    row = [patient_features.get(f, 0) for f in feature_cols]
    proba = model.predict_proba([row])[0]
    scores = {le.classes_[i]: round(float(p) * 100, 2) for i, p in enumerate(proba)}
    return dict(sorted(scores.items(), key=lambda x: x[1], reverse=True))


if __name__ == '__main__':
    train()