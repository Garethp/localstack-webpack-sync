import {
  ListBucketsCommand,
  ListBucketsOutput,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type * as webpack from "webpack";
import { WebpackError } from "terser-webpack-plugin";
import mime from "mime-lite";
import path from "path";

const pluginName = "LocalStackWebpackSync";
export type LocalStackWebpackSyncProps = {
  bucket?: string | RegExp;
};

export default class LocalStackWebpackSync {
  private s3Client: S3Client;
  private bucketError?: WebpackError;
  private bucketName: string;

  constructor(options: LocalStackWebpackSyncProps = {}) {
    const { bucket } = options;

    this.s3Client = new S3Client({
      endpoint: "http://s3.localhost.localstack.cloud:4566",
      region: "eu-west-2",
      credentials: {
        accessKeyId: "test",
        secretAccessKey: "test",
      },
    });

    if (!bucket) {
      throw new Error(`Option "bucket" is required`);
    }

    if (bucket instanceof RegExp) {
      try {
        this.s3Client
          .send(new ListBucketsCommand({}))
          .then(({ Buckets }: ListBucketsOutput) => {
            const buckets =
              Buckets?.filter((bucketToCheck) =>
                bucketToCheck.Name?.match(bucket),
              ) || [];
            if (buckets.length === 0) {
              // @ts-ignore
              this.bucketError = new Error(
                `No bucket found matching ${bucket}`,
              );
              return;
            }

            this.bucketName = buckets[0].Name!;
          });
      } catch (e) {
        // @ts-ignore
        this.bucketError = e;
      }
    } else {
      this.bucketName = bucket;
    }
  }

  apply(compiler: webpack.Compiler) {
    compiler.hooks.done.tapPromise(pluginName, async ({ compilation }) => {
      if (this.bucketError) {
        compilation.errors.push(this.bucketError);
      }
      if (!this.bucketName) return;

      const directoryToSync = compilation.compiler.outputPath;

      const fs = compilation.compiler.outputFileSystem!;

      const allItemsToSync = this.resurrsivelyGetFiles(fs, directoryToSync);

      const uploadPromises = allItemsToSync.map(async (item) => {
        // @ts-ignore
        const contents = await fs.readFileSync(item);
        const key = path.relative(directoryToSync, item);

        const command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: contents,
          ContentType: mime.getType(item),
        });

        return this.s3Client.send(command);
      });

      await Promise.all(uploadPromises);
    });
  }

  // @ts-ignore
  resurrsivelyGetFiles(fs, dirPath: string): string[] {
    const allItems = fs.readdirSync(dirPath);

    return allItems.flatMap((item: string) => {
      const itemPath = path.join(dirPath, item);
      if (!fs.statSync(itemPath).isDirectory()) return path.join(dirPath, item);

      return this.resurrsivelyGetFiles(fs, itemPath);
    });
  }
}
