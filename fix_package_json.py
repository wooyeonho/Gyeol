import json

def main():
    with open('package.json', 'r') as f:
        data = json.load(f)

    # Remove direct dependency on postcss, since we use override
    if 'devDependencies' in data and 'postcss' in data['devDependencies']:
        del data['devDependencies']['postcss']
    if 'dependencies' in data and 'postcss' in data['dependencies']:
        del data['dependencies']['postcss']

    with open('package.json', 'w') as f:
        json.dump(data, f, indent=2)

if __name__ == "__main__":
    main()
