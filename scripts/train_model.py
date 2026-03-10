#!/usr/bin/env python3
"""
train_model.py — Train a terrain/hazard classifier and export to TFLite.

This script trains a MobileNetV2-based image classifier on 6 terrain categories:
  - clear_path
  - debris
  - flood_zone
  - fire_hazard
  - structural_damage
  - safe_shelter

The trained model is exported as a quantized .tflite file suitable for
on-device inference in EchoLocate (constraint: all AI runs locally, no API calls).

Usage:
  1. Organize training images into subdirectories under data/train/:
       data/train/clear_path/
       data/train/debris/
       data/train/flood_zone/
       data/train/fire_hazard/
       data/train/structural_damage/
       data/train/safe_shelter/

  2. Run: python scripts/train_model.py

  3. Output: assets/models/terrain_classifier.tflite

Requirements:
  pip install tensorflow numpy Pillow
"""

import os
import sys
import numpy as np

# Suppress TF info logs
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "2"

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from tensorflow.keras.applications import MobileNetV2

# ──────────────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────────────

IMG_SIZE = 224
BATCH_SIZE = 32
EPOCHS = 20
LEARNING_RATE = 1e-4
NUM_CLASSES = 6
CLASS_NAMES = [
    "clear_path",
    "debris",
    "flood_zone",
    "fire_hazard",
    "structural_damage",
    "safe_shelter",
]

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "train")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "assets", "models")
TFLITE_OUTPUT = os.path.join(OUTPUT_DIR, "terrain_classifier.tflite")
SAVED_MODEL_DIR = os.path.join(OUTPUT_DIR, "saved_model")


def create_dataset(data_dir: str):
    """
    Load images from the training directory structure.
    Falls back to generating synthetic data if no real images are available,
    so the pipeline can be tested end-to-end.
    """
    if os.path.isdir(data_dir) and any(
        os.path.isdir(os.path.join(data_dir, d)) for d in os.listdir(data_dir)
    ):
        print(f"Loading training data from: {data_dir}")

        train_ds = keras.utils.image_dataset_from_directory(
            data_dir,
            validation_split=0.2,
            subset="training",
            seed=42,
            image_size=(IMG_SIZE, IMG_SIZE),
            batch_size=BATCH_SIZE,
            label_mode="categorical",
            class_names=CLASS_NAMES,
        )

        val_ds = keras.utils.image_dataset_from_directory(
            data_dir,
            validation_split=0.2,
            subset="validation",
            seed=42,
            image_size=(IMG_SIZE, IMG_SIZE),
            batch_size=BATCH_SIZE,
            label_mode="categorical",
            class_names=CLASS_NAMES,
        )

        # Optimize pipeline with prefetch
        train_ds = train_ds.prefetch(tf.data.AUTOTUNE)
        val_ds = val_ds.prefetch(tf.data.AUTOTUNE)

        return train_ds, val_ds
    else:
        print("WARNING: No training data found. Generating synthetic dataset.")
        print(f"  Expected directory: {data_dir}")
        print(f"  Expected subdirectories: {CLASS_NAMES}")
        print("  Creating random data for pipeline testing only.\n")

        # Generate random images + labels for pipeline testing
        num_samples = 120  # 20 per class
        rng = np.random.default_rng(42)
        images = rng.integers(0, 256, (num_samples, IMG_SIZE, IMG_SIZE, 3), dtype=np.uint8)
        labels = np.eye(NUM_CLASSES, dtype=np.float32)[
            np.tile(np.arange(NUM_CLASSES), num_samples // NUM_CLASSES)
        ]

        images = images.astype(np.float32)

        split = int(0.8 * num_samples)
        train_ds = (
            tf.data.Dataset.from_tensor_slices((images[:split], labels[:split]))
            .batch(BATCH_SIZE)
            .prefetch(tf.data.AUTOTUNE)
        )
        val_ds = (
            tf.data.Dataset.from_tensor_slices((images[split:], labels[split:]))
            .batch(BATCH_SIZE)
            .prefetch(tf.data.AUTOTUNE)
        )

        return train_ds, val_ds


def build_model() -> keras.Model:
    """
    Build a transfer-learning model using MobileNetV2 as the backbone.

    Architecture decisions:
    - MobileNetV2 is lightweight enough for mobile inference (~3.4M params)
    - We freeze the backbone and only train the classification head
    - GlobalAveragePooling reduces spatial dims efficiently
    - Dropout (0.3) prevents overfitting on small datasets
    - Softmax output with 6 classes
    """
    # Load MobileNetV2 pretrained on ImageNet, without the top layers
    base_model = MobileNetV2(
        input_shape=(IMG_SIZE, IMG_SIZE, 3),
        include_top=False,
        weights="imagenet",
    )

    # Freeze backbone — we only train the head
    base_model.trainable = False

    model = keras.Sequential([
        # Input normalization: [0, 255] -> [0, 1]
        layers.Rescaling(1.0 / 255, input_shape=(IMG_SIZE, IMG_SIZE, 3)),

        # Data augmentation (training only)
        layers.RandomFlip("horizontal"),
        layers.RandomRotation(0.1),
        layers.RandomZoom(0.1),

        # Backbone
        base_model,

        # Classification head
        layers.GlobalAveragePooling2D(),
        layers.Dropout(0.3),
        layers.Dense(128, activation="relu"),
        layers.Dropout(0.2),
        layers.Dense(NUM_CLASSES, activation="softmax"),
    ])

    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=LEARNING_RATE),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )

    return model


def convert_to_tflite(model: keras.Model, output_path: str):
    """
    Convert the Keras model to a quantized TFLite model.

    Quantization strategy:
    - Dynamic range quantization reduces model size by ~4x
    - Post-training quantization is sufficient for our use case
    - The resulting .tflite file is typically 3-5 MB
    """
    # Save as SavedModel first (required for some TFLite converter features)
    os.makedirs(SAVED_MODEL_DIR, exist_ok=True)
    model.save(SAVED_MODEL_DIR)

    # Convert to TFLite with dynamic range quantization
    converter = tf.lite.TFLiteConverter.from_saved_model(SAVED_MODEL_DIR)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]

    # Enable select TF ops if needed for MobileNetV2 compatibility
    converter.target_spec.supported_ops = [
        tf.lite.OpsSet.TFLITE_BUILTINS,
        tf.lite.OpsSet.SELECT_TF_OPS,
    ]
    converter._experimental_lower_tensor_list_ops = False

    tflite_model = converter.convert()

    # Write the .tflite file
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "wb") as f:
        f.write(tflite_model)

    file_size = os.path.getsize(output_path)
    print(f"\nTFLite model saved: {output_path}")
    print(f"Model size: {file_size / 1024 / 1024:.2f} MB")


def verify_tflite(model_path: str):
    """
    Verify the exported TFLite model by running a dummy inference.
    """
    interpreter = tf.lite.Interpreter(model_path=model_path)
    interpreter.allocate_tensors()

    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()

    print(f"\nModel verification:")
    print(f"  Input shape:  {input_details[0]['shape']}")
    print(f"  Input dtype:  {input_details[0]['dtype']}")
    print(f"  Output shape: {output_details[0]['shape']}")
    print(f"  Output dtype: {output_details[0]['dtype']}")

    # Run dummy inference
    dummy_input = np.random.rand(1, IMG_SIZE, IMG_SIZE, 3).astype(np.float32) * 255
    interpreter.set_tensor(input_details[0]["index"], dummy_input)
    interpreter.invoke()
    output = interpreter.get_tensor(output_details[0]["index"])

    print(f"  Dummy output: {output[0]}")
    print(f"  Sum of probs: {output[0].sum():.4f} (should be ~1.0)")
    print(f"  Predicted class: {CLASS_NAMES[np.argmax(output[0])]}")
    print("\n✅ TFLite model verified successfully!")


def main():
    print("=" * 60)
    print("EchoLocate Terrain Classifier Training")
    print("=" * 60)
    print(f"TensorFlow version: {tf.__version__}")
    print(f"Classes: {CLASS_NAMES}")
    print(f"Image size: {IMG_SIZE}x{IMG_SIZE}")
    print(f"Epochs: {EPOCHS}")
    print()

    # Load or generate data
    train_ds, val_ds = create_dataset(DATA_DIR)

    # Build model
    print("\nBuilding MobileNetV2-based model...")
    model = build_model()
    model.summary()

    # Train
    print("\nTraining...")
    history = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=EPOCHS,
        callbacks=[
            keras.callbacks.EarlyStopping(
                monitor="val_loss", patience=5, restore_best_weights=True
            ),
            keras.callbacks.ReduceLROnPlateau(
                monitor="val_loss", factor=0.5, patience=3
            ),
        ],
    )

    # Report final metrics
    final_train_acc = history.history["accuracy"][-1]
    final_val_acc = history.history.get("val_accuracy", [0])[-1]
    print(f"\nFinal training accuracy: {final_train_acc:.4f}")
    print(f"Final validation accuracy: {final_val_acc:.4f}")

    # Convert to TFLite
    print("\nConverting to TFLite...")
    convert_to_tflite(model, TFLITE_OUTPUT)

    # Verify
    verify_tflite(TFLITE_OUTPUT)

    print("\n" + "=" * 60)
    print("Done! Copy the .tflite file to your Expo project:")
    print(f"  {TFLITE_OUTPUT}")
    print("Then rebuild the app with: eas build")
    print("=" * 60)


if __name__ == "__main__":
    main()
