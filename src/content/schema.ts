
import { defineCollection, reference, z } from 'astro:content';

export const blogSchema = defineCollection({
  type: 'content',
  schema: ({image}) => z.object({
    title: z.string(),
    subTitle: z.string().optional(),
    publishDate: z.date(),
    abstract: z.string(),
    image: image(),
    imageAlt: z.string()
    // Reference a single author from the `authors` collection by `id`
    // author: reference('authors'),
    // Reference an array of related posts from the `blog` collection by `slug`
    // relatedPosts: z.array(reference('blog')),
  })
});

// const authors = defineCollection({
//   type: 'data',
//   schema: z.object({
//     name: z.string(),
//     portfolio: z.string().url(),
//   })
// });
