"""
Blender Isometric Sprite Sheet Renderer
========================================
Renders 3D models into isometric sprite sheets for Zoo Tycoon.

Usage (from Blender's scripting tab or command line):
    blender --background --python render_spritesheet.py -- --model animal.blend --output ../public/assets/sprites/animals/

Camera Setup:
    - Orthographic projection
    - Isometric angle: 30° elevation (arctan(1/√2) ≈ 35.264° true iso, but 30° looks better for games)
    - 8 rotation angles (0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°) for directional sprites
    - 4 angles (SE, SW, NW, NE) minimum for isometric with mirroring

Tile Dimensions:
    - Tile footprint: 64x32 pixels (diamond)
    - Sprite frame size: 64x64 pixels (to accommodate height)
    - Large animals: 128x128 or 128x96 frames

Output:
    - Individual frames: {name}_{anim}_{dir}_{frame}.png
    - Sprite sheet: {name}_sheet.png (grid layout)
    - Metadata JSON: {name}_meta.json (frame positions, timing)
"""

import bpy
import math
import json
import os
import sys
from mathutils import Vector, Euler


# === Configuration ===

# Standard tile-aligned frame sizes
FRAME_SIZES = {
    'small': (64, 64),      # Insects, small reptiles, fish
    'medium': (96, 96),     # Most animals (iguanas, turtles, visitors)
    'large': (128, 128),    # Sharks, crocs, giant creatures
}

# Camera angles for isometric directions
# In our isometric system: SE=default, SW=90°, NW=180°, NE=270°
DIRECTIONS = {
    'SE': 0,
    'SW': 90,
    'NE': 270,
    'NW': 180,
}

# All 8 directions for smoother rotation (optional)
DIRECTIONS_8 = {
    'S': 0, 'SE': 45, 'E': 90, 'NE': 135,
    'N': 180, 'NW': 225, 'W': 270, 'SW': 315,
}

# Standard animations and their frame counts
ANIMATIONS = {
    'idle': 4,
    'walk': 8,
    'eat': 6,
    'sleep': 2,
    'swim': 6,      # For aquatic animals
    'special': 4,   # Species-specific (e.g., chameleon color change)
}

# Isometric camera elevation angle
ISO_ELEVATION = math.radians(30)


def setup_camera(scene, frame_width, frame_height):
    """Set up orthographic camera at isometric angle."""
    cam_data = bpy.data.cameras.new('IsoCam')
    cam_data.type = 'ORTHO'
    # Scale orthographic to fit the frame; adjust per model
    cam_data.ortho_scale = 2.0

    cam_obj = bpy.data.objects.new('IsoCam', cam_data)
    scene.collection.objects.link(cam_obj)
    scene.camera = cam_obj

    # Position camera at isometric angle
    distance = 10
    cam_obj.location = Vector((
        distance * math.cos(ISO_ELEVATION),
        -distance * math.cos(ISO_ELEVATION),
        distance * math.sin(ISO_ELEVATION) + 1
    ))

    # Point at origin
    direction = Vector((0, 0, 0.5)) - cam_obj.location
    rot_quat = direction.to_track_quat('-Z', 'Y')
    cam_obj.rotation_euler = rot_quat.to_euler()

    return cam_obj


def setup_lighting(scene):
    """Set up clean lighting for sprite rendering."""
    # Key light (warm, from upper right)
    key = bpy.data.lights.new('KeyLight', 'SUN')
    key.energy = 3.0
    key.color = (1.0, 0.95, 0.9)
    key_obj = bpy.data.objects.new('KeyLight', key)
    key_obj.rotation_euler = Euler((math.radians(45), 0, math.radians(45)))
    scene.collection.objects.link(key_obj)

    # Fill light (cool, softer, from left)
    fill = bpy.data.lights.new('FillLight', 'SUN')
    fill.energy = 1.0
    fill.color = (0.85, 0.9, 1.0)
    fill_obj = bpy.data.objects.new('FillLight', fill)
    fill_obj.rotation_euler = Euler((math.radians(60), 0, math.radians(-60)))
    scene.collection.objects.link(fill_obj)

    # Ambient (world)
    world = bpy.data.worlds.new('SpriteWorld')
    world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (0.15, 0.15, 0.15, 1.0)
    bg.inputs['Strength'].default_value = 0.5
    scene.world = world


def setup_render_settings(scene, frame_width, frame_height):
    """Configure render settings for clean sprite output."""
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 64
    scene.cycles.use_denoising = True

    scene.render.resolution_x = frame_width
    scene.render.resolution_y = frame_height
    scene.render.resolution_percentage = 100

    # Transparent background
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'


def rotate_model(obj, angle_degrees):
    """Rotate model around Z axis for directional sprites."""
    obj.rotation_euler.z = math.radians(angle_degrees)


def render_frame(scene, output_path):
    """Render a single frame to disk."""
    scene.render.filepath = output_path
    bpy.ops.render.render(write_still=True)


def render_spritesheet(model_path, output_dir, size='medium',
                       animations=None, directions=None, use_8_dir=False):
    """
    Main rendering pipeline.

    Args:
        model_path: Path to .blend file containing the model
        output_dir: Directory to save rendered frames
        size: Frame size preset ('small', 'medium', 'large')
        animations: Dict of {anim_name: frame_count} to render
        directions: Which directional views to render
        use_8_dir: Use 8 directions instead of 4
    """
    if animations is None:
        animations = ANIMATIONS
    if directions is None:
        directions = DIRECTIONS_8 if use_8_dir else DIRECTIONS

    frame_w, frame_h = FRAME_SIZES[size]
    model_name = os.path.splitext(os.path.basename(model_path))[0]

    os.makedirs(output_dir, exist_ok=True)

    # Clear scene
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene

    # Setup
    setup_render_settings(scene, frame_w, frame_h)
    cam = setup_camera(scene, frame_w, frame_h)
    setup_lighting(scene)

    # Import model
    with bpy.data.libraries.load(model_path) as (data_from, data_to):
        data_to.objects = data_from.objects

    root_obj = None
    for obj in data_to.objects:
        if obj is not None:
            scene.collection.objects.link(obj)
            if root_obj is None:
                root_obj = obj

    if root_obj is None:
        print(f"Error: No objects found in {model_path}")
        return

    # Metadata for the sprite sheet
    meta = {
        'name': model_name,
        'frameSize': {'width': frame_w, 'height': frame_h},
        'animations': {},
    }

    # Render each animation × direction × frame
    for anim_name, frame_count in animations.items():
        meta['animations'][anim_name] = {
            'frameCount': frame_count,
            'frameDuration': 150,  # ms per frame (default)
            'directions': list(directions.keys()),
        }

        # Set animation if it exists
        if root_obj.animation_data and root_obj.animation_data.action:
            action = bpy.data.actions.get(anim_name)
            if action:
                root_obj.animation_data.action = action

        for dir_name, angle in directions.items():
            rotate_model(root_obj, angle)

            for frame_idx in range(frame_count):
                # Set frame for animation
                scene.frame_set(frame_idx)

                filename = f"{model_name}_{anim_name}_{dir_name}_{frame_idx:02d}"
                filepath = os.path.join(output_dir, filename)

                print(f"  Rendering: {filename}")
                render_frame(scene, filepath)

    # Write metadata
    meta_path = os.path.join(output_dir, f"{model_name}_meta.json")
    with open(meta_path, 'w') as f:
        json.dump(meta, f, indent=2)

    print(f"\nDone! Rendered {model_name} to {output_dir}")
    print(f"Metadata: {meta_path}")


def pack_spritesheet(frames_dir, model_name, output_path):
    """
    Pack individual frames into a single sprite sheet image.
    Run this after rendering all frames.

    Creates a grid layout: rows = animations × directions, cols = frames
    """
    # This would use Pillow (PIL) outside of Blender
    # For in-Blender use, we compose using Blender's compositor
    print(f"Pack spritesheet: {frames_dir} -> {output_path}")
    print("Use TexturePacker or the pack_sprites.py script for atlas generation.")


# === CLI Entry Point ===

if __name__ == '__main__':
    # Parse args after '--'
    argv = sys.argv
    if '--' in argv:
        argv = argv[argv.index('--') + 1:]
    else:
        argv = []

    import argparse
    parser = argparse.ArgumentParser(description='Render isometric sprite sheet')
    parser.add_argument('--model', required=True, help='Path to .blend model file')
    parser.add_argument('--output', required=True, help='Output directory for frames')
    parser.add_argument('--size', default='medium', choices=['small', 'medium', 'large'])
    parser.add_argument('--8dir', dest='use_8_dir', action='store_true',
                        help='Render 8 directions instead of 4')
    args = parser.parse_args(argv)

    render_spritesheet(args.model, args.output, args.size, use_8_dir=args.use_8_dir)
