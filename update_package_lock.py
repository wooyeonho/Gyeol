import json

def main():
    try:
        with open('package.json', 'r') as f:
            package_data = json.load(f)

        # Ensure we have our override setup
        if 'overrides' not in package_data:
            package_data['overrides'] = {}
        package_data['overrides']['postcss'] = "^8.5.10"

        # Make sure postcss isn't listed directly
        if 'devDependencies' in package_data and 'postcss' in package_data['devDependencies']:
            del package_data['devDependencies']['postcss']
        if 'dependencies' in package_data and 'postcss' in package_data['dependencies']:
            del package_data['dependencies']['postcss']

        with open('package.json', 'w') as f:
            json.dump(package_data, f, indent=2)

        print("Updated package.json overrides.")
    except Exception as e:
        print(f"Error updating package.json: {e}")

if __name__ == "__main__":
    main()
